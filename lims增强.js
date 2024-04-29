setTimeout(function my_nav() {
    // const j_script = document.createElement('script')
    // j_script.src = "http://libs.baidu.com/jquery/2.1.1/jquery.min.js"
    // document.head.appendChild(j_script)
    // mycss = document.createElement('link')
    // mycss.setAttribute('rel', 'stylesheet')
    // mycss.setAttribute('href', 'http://ks.ezyro.com/css/lims.css')
    // document.body.appendChild(mycss)
    const app = document.getElementById("app")
    if(!app ) {
      console.log("app not loaded, exit.")
      return
    }
    console.log("fucking lims ...")
    //document.querySelector(".nav-logo-text").remove()
    const div = document.createElement("div")
    div.style.position = "relative"
    div.classList = "mynav"
    div.style = "display:none"
    div.innerHTML =
        `
        <div id="loading" style="display:none;background-color: rgb(0 0 0 / 80%);border-radius: 50px;border: 1px solid rgb(211, 212, 211);z-index: 19891017;position: absolute;width: 50%;color: white;font-size: larger;text-align: center;left: 50%;margin-left: -350px;">
        数据加载中……
    </div>
        通过样品编号：<input type="text" id="sampleNo" /><button id="search_by_sampleNo" >查任务</button>
        通过任务号：<input type="text" id="inp_orderNo" /><button id="search_by_orderNo" >查样品</button>
        <button id="get_qcvalue" >查密码样</button>
        <button id="get_fxyps" >复制样品编号</button>
        <div class="show_container" style="display:block"></div>
        `
    document.body.insertBefore(div, app)
    const showEle = document.createElement("div")
    showEle.innerHTML = `<span id="show_hide" style="height:28px;text-align:center;float:left;cursor:pointer;background-color:#00b8af;padding: 0px 10px;border-radius: 10px;color: white;">+</span> `
    document.querySelector(".top-toolbar").insertBefore(showEle, document.querySelector(".nav-logo-text"))
    document.querySelector(".mynav").addEventListener("click", handle)
    document.querySelector("#show_hide").addEventListener("click", show_handle)
},5000)
// 封装 ajax
function ajax(options) {
    let defaultoptions = {
        url: "",
        method: "GET",
        async: true,
        data: {},
        headers: {},
        res_type: "json",
        success: function (res) { console.log("success", res) },
        error: function (err) { console.log("error", err) }
    }
    let { url, method, async, data, headers, res_type, success, error } = {
        ...defaultoptions,
        ...options
    }
    if (typeof data === 'object') {  // && headers["content-type"]?.indexof("json") > -1
        data = JSON.stringify(data)
    }
    else {
        data = queryStringify(data)
    }
    // 如果是 get 请求，并且有参数，那么直接组装一下 ur1 信息
    if (/^get$/i.test(method) && data) url += '?' + data
    // 4。发送请求
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, async)
    xhr.onload = function () {
        if (!/^2\d{2}$/.test(xhr.status)) {
            error(`错误状态码:${xhr.status}`)
            return
        }
        try {
            let result = (res_type === "json" ? JSON.parse(xhr.responseText) : xhr.responseText)
            success(result)
        } catch (err) {
            error("unknowe error")
        }
    }
    // 设置请求头内的信息
    for (let k in headers) xhr.setRequestHeader(k, headers[k])
    xhr.withCredentials = true
    if (/^get$/i.test(method)) {
        xhr.send()
    } else {
        xhr.send(data)
    }
    function queryStringify(obj) {
        let str = ''
        for (let k in obj) str += `${k}=${obj[k]}&`
        return str.slice(0, -1)
    }
}
function pajax(options) {
    return new Promise(function (resolve, reject) {
        ajax({
            ...options,
            success: function (res) {
                resolve(res)
            },
            error: function (err) {
                reject(err)
            }
        })
    })
}
const host = 'http://59.211.223.38:8080'
async function get_samples(orderno) {
    document.querySelector("#loading").style.display = "block"
// 定义常量 host
const host = "http://59.211.223.38:8080";

// 创建 samples 对象//用来装样品数据的大对象，里面会包含cyd、ypfzs、yps三个对象
const samples = {
  ypfzs: [],
  yps: [],
  QCs: []
};
// 请求第一层数据
const firstLayer_url = `${host}/secure/emc/module/bp/sample/samples/queries/undoable`;
const firstLayer_body = {
  "p": {
    "f": {
      "status_IN": "preLogged,done",
      "orgId_SEQ": "101009"
    },
    "n": 1,
    "s": 50,
    "qf": {
      "projNo_CISC": orderno
    }
  }
};

fetch(firstLayer_url, {
  method: 'POST',
  body: JSON.stringify(firstLayer_body),
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  // 将结果赋值给 samples.cyds
  samples.cyds = data.rows;

  // 请求第二层数据
  const secondLayer_url = `${host}/secure/emc/module/bp/bp/orders`;

  // 控制每次并发 5 个 fetch 请求
  const concurrency = 5;
  let index = 0;

  function fetchSecondLayer() {
    const fetchPromises = [];

    for (let i = 0; i < concurrency && index < samples.cyds.length; i++) {
      const id = samples.cyds[index].id;
      const secondLayer_body = {
        "p": {
          "f": {},
          "n": 1,
          "s": 500,
          "qf": {}
        }
      };

      const fetchPromise = fetch(`${secondLayer_url}/${id}/sample-container-orders/queries`, {
        method: 'POST',
        body: JSON.stringify(secondLayer_body),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        // 将请求结果的 rows 字段增加 sampleId_SEQ 属性
        data.rows.forEach(item => {
          item.sampleId_SEQ = id;
        });
        // 将结果添加到 samples.ypfzs
        samples.ypfzs = samples.ypfzs.concat(data.rows);
        // 在 samples.ypfzs 中标记已处理过的第二层数据
        samples.ypfzs.forEach(sample => {
          sample.processed = true;
        });
      });

      fetchPromises.push(fetchPromise);
      index++;
    }

    Promise.all(fetchPromises)
      .then(() => {
        if (index < samples.cyds.length) {
          fetchSecondLayer();
        } else {
          // 请求第三层数据
          fetchThirdLayer();
        }
      })
      .catch(error => console.error('Error:', error));
  }

  fetchSecondLayer();
})
.catch(error => console.error('Error:', error));

function fetchThirdLayer() {
  // 请求第三层数据
  const thirdLayer_url = `${host}/secure/emc/module/bp/bp/orders`;
  const concurrency = 10;

  function fetchNextBatch() {
    const fetchPromises = [];

    for (let i = 0; i < concurrency && samples.ypfzs.length > 0; i++) {
      const sample = samples.ypfzs.shift(); // 从 samples.ypfzs 数组中取出一个样本数据
      const id = sample.id;
      const sampleId_SEQ = sample.sampleId_SEQ;
      const thirdLayer_body = {
        "p": {
          "f": {
            "sampleId_SEQ": sampleId_SEQ,
            "sampleId": sampleId_SEQ,
            "orderId": id,
            "orderAccept": "1"
          },
          "n": 1,
          "s": 500,
          "qf": {}
        }
      };

      const fetchPromise = fetch(`${thirdLayer_url}/${id}/order-containers/queries`, {
        method: 'POST',
        body: JSON.stringify(thirdLayer_body),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        // 处理请求结果的 rows 字段
        data.rows.forEach(row => {
          // 如果 mysteryValue 不存在或为空，用 testName 替代
          if (!row.mysteryValue || row.mysteryValue.trim() === '') {
            row.mysteryValue = row.testName;
          }
          // 添加额外属性
          row.monitorpointname = sample.ext$.monitorpointname || null;
          row.qcName = sample.qcName || null;
          row.parentOrderNo = sample.parentOrderNo || null;
          row.clientOrderName = sample.clientOrderName || null;
        });

        // 将结果添加到 samples.yps 数组中
        samples.yps = samples.yps.concat(data.rows);
      });

      fetchPromises.push(fetchPromise);
    }

    Promise.all(fetchPromises)
      .then(() => {
        if (samples.ypfzs.length > 0) {
          fetchNextBatch();
        } else {
          // 将 samples 对象保存到 localStorage
                document.querySelector("#loading").style.display = "none"
    deal_data(samples.yps)
    localStorage.setItem("samples", JSON.stringify(samples))
    //get_qcvalue()
    showHTML(samples.yps, document.querySelector(".show_container"))

        }
      })
      .catch(error => console.error('Error:', error));
  }

  fetchNextBatch();
}
}
function deal_data(yps) {
    yps.forEach((item) => {
        if (item.parentOrderNo) {
            item.qcParent = yps.filter(function (e) {
                if (e.monitorpointname == item.monitorpointname && e.orderNo == item.parentOrderNo) {
                    // console.log("item".item)
                    // console.log("e",e)
                    if (e.mysteryValue && item.mysteryValue) {
                        var pxxm = item.mysteryValue.split(",")
                        var ylxm = e.mysteryValue.split(",")
                    } else if (e.testName && item.testName) {
                        pxxm = item.testName.split(",")
                        ylxm = e.testName.split(",")
                    } else {
                        return false
                    }
                    return pxxm.every(item => ylxm.includes(item))
                }
            })
        }
    })
}
function get_qcvalue() {
    document.querySelector("#loading").style.display = "block"
    const samples = JSON.parse(localStorage.getItem("samples"))
    const yps = samples.yps
    yps.forEach(async function (item) {
        if (item.qcName === "密码质量控制") {
            const r = await pajax({
                url: "http://59.211.223.38:8080/secure/emc/module/bp/bp/order-tasks/order-item-group/queries",
                method: "POST",
                data: { "p": { "f": { "orderContainerId_SEQ": item.id }, "n": 1, "s": 50, "qf": {} } },
                headers: { "content-type": "application/json" },
                res_type: "json"
            })
            const qcs = [...new Set(r.rows.map(e => e.ext$.ordertaskid))]
            // console.log("QC:",qcs)
            qcs.forEach(async (list) => {
                const re = await pajax({
                    url: "http://59.211.223.38:8080/secure/emc/module/bp/order-task-concents/queries/raw",
                    method: "POST",
                    data: { "p": { "f": { "orderTaskId_IN": list }, "n": 1, "s": 50, "qf": {} } },
                    headers: { "content-type": "application/json" },
                    res_type: "json"
                })
                samples.QCs.push(...re.rows)
                localStorage.setItem("samples", JSON.stringify(samples))
            })
        }
    })
    document.querySelector("#loading").style.display = "none"
    showHTML(samples.yps, document.querySelector(".show_container"))
}
async function get_pa_yps(pa_no) {
    const r = await pajax({
        url: "http://59.211.223.38:8080/secure/emc/module/bp/bp/order-tasks/queries/order-group-runs",
        method: "POST",
        data: { "p": { "f": { "ext$": {}, "runId_SEQ": pa_no, "showTestName": "0", "showParamName": "0" }, "n": 1, "s": 50, "qf": {} } },
        headers: { "content-type": "application/json" },
        res_type: "json"
    })
    console.log(r.rows)
}
function get_fxyps() {
    const nodes = document.querySelectorAll("[field='ext$.ordercontainerno']")
    const temp = []
    nodes.forEach(node => temp.push(node.innerText))
    const fxyps = [...new Set(temp)]
    document.querySelector("[name='ext$.ordercontainerno']").value = fxyps.join(",")
    //    const mydiv = document.createElement("div")
    //    mydiv.id = "mydiv"
    //    mydiv.innerHTML = `<button type="button">点我!</button> `
    //    document.querySelector("#emc-run-edit-list-order-task-grid").querySelector(".toolbar").appendChild(mydiv)
    document.querySelector("[name='ext$.ordercontainerno']").select();
    document.execCommand("copy", true)
    document.querySelector("[name='ext$.ordercontainerno']").value = ""
    console.log(fxyps.join(","))
}
function data_wash() {
    // copyofarr = JSON.parse(JSON.stringify(arr))
    const yps = JSON.parse(localStorage.getItem("samples")).yps
    aa()
    const opt = JSON.parse(localStorage.getItem("data_opts"))
    // console.log(opt)
    const newyps = yps.filter(item => {
        const flag = []
        for (let key in opt) {
          if (opt[key]){
              try {
                flag.push(item[key]==(opt[key]))//flag.push(item[key].includes(opt[key]))
            }
            catch (err) {
                // console.log(err)
            }
          }
        }
        return flag.every(e => e)
    })
    showHTML(newyps, document.querySelector(".show_container"), opt)
}
function aa() {
    let opt = JSON.parse(localStorage.getItem("data_opts"))
    if (!opt) { opt = {} }
    let st = document.querySelectorAll(".st")
    st.forEach(item => opt[item.id] = item.options[item.selectedIndex].value)
    localStorage.data_opts = JSON.stringify(opt)
}
/**
 * 设置select选中
 * @param selectId select的id值
 * @param checkValue 选中option的值
 * 使用setSelectChecked(selectId, checkValue);
 */
function setSelectChecked(selectId, checkValue) {
    var select = document.getElementById(selectId);
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value == checkValue) {
            select.options[i].selected = true;
            break;
        }
    }
}
function showHTML(newarr, ele, opt) {
    const arr = JSON.parse(localStorage.getItem("samples")).yps
    const qcs = JSON.parse(localStorage.getItem("samples")).QCs
    const mysteryValue = [...new Set(arr.map(e => e.mysteryValue))]
    const monitorpointname = [...new Set(arr.map(e => e.monitorpointname))].sort()
    const orderNo = [...new Set(arr.map(e => e.orderNo))].sort()
    const sampleCompleteDate = [...new Set(arr.map(e => e.sampleCompleteDate))].sort()
    const no_sampleCompleteDate = newarr.filter(i => !i.sampleCompleteDate)
    const with_sampleCompleteDate = newarr.filter(i => i.sampleCompleteDate)
    newarr = [...no_sampleCompleteDate, ...with_sampleCompleteDate]
    newarr.sort((a, b) => {
        if (a.orderNo < b.orderNo) return -1
        if (a.orderNo > b.orderNo) return 1
        return 0
    })
    newarr.sort((a, b) => {
        if (a.sampleCompleteDate < b.sampleCompleteDate) return -1
        if (a.sampleCompleteDate > b.sampleCompleteDate) return 1
        return 0
    })
    const res = newarr.map(item => {
        return `<tr>
                    <td style='width: 15%;'>${item.orderContainerNo} ${(item.qcName == "N/A" ? "" : ("(" + item.qcName + ")"))}</td>
                    <td style='width: 10%;'>${(item.qcParent ? (item.qcParent[0] ? item.qcParent[0].orderContainerNo : "") : (qcs.filter(e => e.ext$.ordercontainerno === item.orderContainerNo) ? qcs.filter(e => e.ext$.ordercontainerno === item.orderContainerNo).map(i => (i.category + "(" + i.onlyNo + "):" + i.lowLimit + "~" + i.highLimit + i.concentUnit)) : ""))}</td>
                    <td style='width: 35%;'>${(item.mysteryValue ? item.mysteryValue : item.testName)}</td>
                    <td style='width: 15%;'>${(item.orderNo ? item.orderNo : "")}</td>
                    <td style='width: 15%;'>${item.monitorpointname ? item.monitorpointname : (item.clientOrderName ? item.clientOrderName : "")}</td>
                    <td style='width: 10%;'>${(item.sampleCompleteDate ? item.sampleCompleteDate : "")}</td>
                </tr>`
    })
    ele.innerHTML = `<table border='1' style='width: 100%;'><tbody>
                        <tr style='background-color:#00b8af;color: white;'>
                            <th title="点击此处复制下列全部样品编号" style="cursor:pointer;" onclick='javascript:document.querySelector("#ypbh").select(); document.execCommand("copy", true);'>样品编号<input id="ypbh" type="text" style="position: fixed; clip: rect(0px, 0px, 0px, 0px); top: 0px;"></th>
                            <th>关联样品信息</th>
                            <th>
                                <select class="st" id="mysteryValue" style="width: 100%;background-color:#00b8af">
                                <option value="">=====选择项目=====</option>
                                    ${(mysteryValue.map((e) => (e ? ("<option value='" + e + "'>" + e.substr(0, 60) + "</option>") : "")).join(""))}
                                </select>
                            </th>
                            <th>
                                <select class="st" id="orderNo"  style="width: 100%;background-color:#00b8af">
                                    <option value="">==选择采样单==</option>
                                    ${orderNo.map(e => ("<option value='" + (e ? e : "") + "'>" + (e ? e : "<-此项不可选->") + "</option>")).join("")}
                                </select>
                            </th>
                            <th>
                                <select class="st" id="monitorpointname"  style="width: 100%;background-color:#00b8af">
                                    <option value="">==选择点位==</option>
                                    ${monitorpointname.map(e => ("<option value='" + (e ? e : "") + "'>" + (e ? e : "<-此项不可选->") + "</option>")).join("")}
                                </select>
                            </th>
                            <th>
                                <select class="st" id="sampleCompleteDate"  style="width: 100%;background-color:#00b8af">
                                    <option value="">==选择采样时间==</option>
                                    ${sampleCompleteDate.map(e => ("<option value='" + (e ? e : "") + "'>" + (e ? e : "<-此项不可选->") + "</option>")).join("")}
                                </select>
                            </th>
                        </tr>
                        ${res.join("")}
                        </tbody></table>`
    document.querySelector("#ypbh").value = newarr.map(i => i.orderContainerNo).join(",")
    for (let key in opt) {
        setSelectChecked(key, opt[key])
    }
    document.querySelectorAll(".show_container>table>tbody>tr:nth-child(odd)").forEach((e, i) => { if (i > 0) { e.style.backgroundColor = "#f3fbfa" } })
    document.querySelectorAll(".show_container>table>tbody>tr:nth-child(even)").forEach(e => e.style.backgroundColor = "#ffffff")
    document.querySelectorAll(".st").forEach(item => item.addEventListener("change", data_wash))
}
function get_detail_by_sampleNo(sampleNo = "220501633", cb) {
    const xhr = new XMLHttpRequest()
    const url = `${host}/secure/emc/module/bp/disposal-records/queries/raw`
    const data = `{"p":{"f":{"orgId_SEQ":"101009","analysisType":"1"},"n":1,"s":50,"qf":{"ext$.orderContainerNo_CISC":"${sampleNo}"}}}`
    xhr.open("post", url, false)
    xhr.onload = function () {
        cb(JSON.parse(xhr.responseText).rows)
    }
    xhr.setRequestHeader("content-type", "application/json")
    xhr.withCredentials = true
    xhr.send(data)
}
function show_handle(e) {
    // console.log(e.target)
    const show_hide = document.getElementById("show_hide")
    let isshow = show_hide.textContent == "+" ? false : true
    if (e.target === show_hide) {
        isshow ? hide() : show()
        return
    }
}
    function show() {
          const div = document.querySelector(".mynav")
        div.style.display = "block"
      document.querySelector(".show_container").style.display = "block"
        document.getElementById("show_hide").innerHTML = "-"
        isshow = true
    }
    function hide() {
          const div = document.querySelector(".mynav")
        div.style.display = "none"
        document.getElementById("show_hide").innerHTML = "+"
        isshow = false
    }
function handle(e) {
    // console.log(e.target)
    const div = document.querySelector(".show_container")
    if (e.target === document.getElementById("search_by_sampleNo")) {
        get_detail_by_sampleNo(document.getElementById("sampleNo").value, function (res) {
            const r = res.map(item => {
                return `<tr>
                            <td>${item.ext$.orderno} </td>
                            <td>${item.ext$.projname} </td>
                            <td>${item.orderContainerNo} </td>
                            <td>${item.testName} </td>
                        </tr>`
            })
            div.innerHTML = `<table border='1' style='width: 100%;'><tbody>
                                <tr style='background-color:#00b8af;color: white;'>
                                    <th>采样单编号</th>
                                    <th>任务名称</th>
                                    <th>样品编号</th>
                                    <th>项目</th>
                                </tr>
                                    ${r.join("")}
                            </tbody></table>`
        })
        show()
        return
    }
    if (e.target === document.getElementById("search_by_orderNo")) {
        get_samples(document.getElementById("inp_orderNo").value)
        show()
        return
    }
    if (e.target === document.getElementById("get_qcvalue")) {
        get_qcvalue()
        return
    }
    if (e.target === document.getElementById("get_fxyps")) {
        get_fxyps()
        return
    }
}
