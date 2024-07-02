setTimeout(function my_nav() {
    const app = document.getElementById("app")
    if (!app) {
        console.log("app not loaded, exit.")
        return
    }
    console.log("fucking lims ...")
    const div = document.createElement("div")
    div.style.position = "relative"
    div.classList = "mynav"
    div.style = "display:none"
    div.innerHTML =
        `
        <div id="loading" style="display:none;background-color: rgb(0 0 0 / 80%);border-radius: 50px;border: 1px solid rgb(211, 212, 211);z-index: 19891017;position: absolute;width: 50%;color: white;font-size: larger;text-align: center;left: 50%;margin-left: -350px;">
        数据加载中<span id="proces">999</span>……
    </div>
        通过样品编号：<input type="text" id="sampleNo" /><button id="search_by_sampleNo" >查任务</button>
        通过任务号：<input type="text" id="inp_orderNo" /><button id="search_by_orderNo" >查样品</button>
        <button id="get_qcvalue" >查密码样</button>
        <button id="get_fxyps" >复制样品编号</button>
        <span id="dForm"></span>
        <input type="number" id="update_num"  style="width:50px"/><button id="updatedb_qc" >更新质控样数据库</button>
        <div class="show_container" style="display:block"></div>
        `
    document.body.insertBefore(div, app)
    const showEle = document.createElement("div")
    showEle.innerHTML = `<span id="show_hide" style="height:28px;text-align:center;float:left;cursor:pointer;background-color:#00b8af;padding: 0px 10px;border-radius: 10px;color: white;">+</span> `
    document.querySelector(".top-toolbar").insertBefore(showEle, document.querySelector(".nav-logo-text"))
    document.querySelector(".mynav").addEventListener("click", handle)
    document.querySelector("#show_hide").addEventListener("click", show_handle)
    search_qc()
}, 5000)
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
        ypfzs_bak: [],
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
            "s": 99999,
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
                            "s": 99999,
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
                            document.querySelector("#proces").innerHTML = index + "/" + samples.cyds.length
                        } else {
                            samples.ypfzs_bak = JSON.parse(JSON.stringify(samples.ypfzs));
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
                        "s": 99999,
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
                        document.querySelector("#proces").innerHTML = (samples.ypfzs_bak.length - samples.ypfzs.length) + "/" + samples.ypfzs_bak.length
                    } else {
                        // 将 samples 对象保存到 localStorage
                        document.querySelector("#loading").style.display = "none"
                        deal_data(samples.yps)
                        localStorage.setItem("samples", JSON.stringify(samples))
                        savesamplestodb(samples)
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
                savesamplestodb(samples)
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
            if (opt[key]) {
                try {
                    flag.push(item[key] == (opt[key]))//flag.push(item[key].includes(opt[key]))
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
    if (e.target === document.getElementById("updatedb_qc")) {
        update2db_qc()
        return
    }
    document.querySelectorAll(".sinfo").forEach(item => {
        if (item == e.target) {
            if (e.target.querySelector("div")) {
                e.target.removeChild(e.target.querySelector("div"))
            } else {
                showStockInfo(e.target.id.split("_")[0], e.target.id.split("_")[1])
                return
            }
        }
    })
}

/**===========================查最新50条信息===================存储到db========================================================
function update2db_qc() {

    const orgIds = ["101001", "101002", "101003", "101004", "101005", "101006", "101007", "101008", "101009", "101010", "101011", "101012", "101013", "101014"];
    const url = "http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtl-receives/queries/searchable";
    const payloadTemplate = {
        "p": {
            "f": {
                "orgId_SEQ": null,
                "parentId": "1"
            },
            "n": 1,
            "s": 20,
            "qf": {},
            "o": [{ "receiveDate": "desc" }]
        }
    };
    async function sendRequests(orgIdsBatch) {
        const rows = [];
        await Promise.all(orgIdsBatch.map(orgId => {
            payloadTemplate.p.f.orgId_SEQ = orgId;
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payloadTemplate)
            })
                .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
                .then(data => {
                console.log(`Response for orgId ${orgId}:`);
                rows.push(...data.rows); // 将当前请求的 rows 字段合并到总的 rows 数组中
            })
                .catch(error => {
                console.error(`Error requesting orgId ${orgId}:`, error);
            });
        }));
        return rows;
    }
    const batchSize = 5;
    const concurrentRequests = 5;
    async function sendInBatches(orgIds, batchSize, concurrentRequests) {
        const allRows = [];
        while (orgIds.length > 0) {
            const orgIdsBatch = orgIds.splice(0, batchSize);
            const rows = await sendRequests(orgIdsBatch);
            allRows.push(...rows);
        }
        console.log("All rows:", allRows); // 打印所有请求合并后的 rows 字段
        //allRows = allRows.filter(i => i.onlyNo); //去除onlyNo为空的数据
        stort_qc(allRows.filter(i => i.onlyNo)); //存储到db
    }
    sendInBatches(orgIds.slice(), batchSize, concurrentRequests);
    function stort_qc(data) {
        fetch('http://gxpf.hima.eu.org:8888/stort_qc', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => response.json())
            .then(data => alert(data.msg))
    }
}
**/
function update2db_qc() {
    // 获取输入框中的更新数量
    const update_num = document.getElementById("update_num").value;

    // 第一个API的URL
    const url = "http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtl-receives/queries/searchable";

    // 构造请求体模板
    const payloadTemplate = {
        "p": {
            "f": {},
            "n": 1,
            "s": update_num,
            "qf": {},
            "o": [{ "receiveDate": "desc" }]
        }
    };

    // 发起第一个API的请求
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(payloadTemplate),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            // 如果第一个请求成功，处理数据并发送到第二个API
            if (data && data.rows) {
                stort_qc(data.rows);
            } else {
                alert("No data received from the first API.");
            }
        })
        .catch(error => {
            // 处理第一个请求的错误
            console.error('Error:', error);
            alert('Failed to fetch data from the first API.');
        });

    // 定义第二个API的处理函数
    function stort_qc(data) {
        fetch('https://api.hima.eu.org/stort_qc', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                // 处理第二个请求的响应
                alert(data.msg);
            })
            .catch(error => {
                // 处理第二个请求的错误
                console.error('Error:', error);
                alert('Failed to send data to the second API.');
            });
    }
}

//======================================================================================================


//---------------------新功能----------------------------
function search_qc() {

    var categories = ['only No', 'batch No', 'category', 'createdById', 'remark', 'application'];


    // 创建动态表单和结果显示区域
    var dynamicFormDiv = document.createElement('span');
    dynamicFormDiv.id = 'dynamicForm';

    // 创建添加条件按钮
    var addButton = document.createElement('button');
    addButton.textContent = '+';
    addButton.onclick = function () {
        addCondition(categories);
    };

    dynamicFormDiv.appendChild(addButton);

    // 创建提交按钮
    var submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.onclick = function () { submitForm(); }

    dynamicFormDiv.appendChild(submitButton);

    document.getElementById('dForm').appendChild(dynamicFormDiv);

    // 创建结果显示区域
    var resultsDiv = document.createElement('div');
    resultsDiv.id = 'results';
    document.querySelector(".show_container").appendChild(resultsDiv);

    // 添加初始查询条件
    addCondition(categories);

    // 检查初始查询条件数量，如果只有一个，隐藏删除按钮
    var initialDropdowns = document.querySelectorAll('.dropdown');
    var removeButtons = document.querySelectorAll('.removeButton');
    if (initialDropdowns.length === 1) {
        removeButtons[0].style.display = 'none';
    }


    // 添加查询条件的函数
    function addCondition(categories) {
        var dynamicFormDiv = document.getElementById('dynamicForm');
        var dropdowns = document.querySelectorAll('.dropdown');

        // 检查已添加的条件数量
        if (dropdowns.length >= categories.length) {
            alert('You can only add up to ' + categories.length + ' conditions.');
            return;
        }

        var selectDropdown = document.createElement('select');
        selectDropdown.className = 'dropdown';

        categories.forEach(function (category) {
            var option = document.createElement('option');
            option.value = category.replace(/\s+/g, '');
            option.textContent = category;
            selectDropdown.appendChild(option);
        });

        dynamicFormDiv.insertBefore(selectDropdown, dynamicFormDiv.lastChild);

        var inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'inputField';
        inputField.placeholder = 'Enter something';

        // 添加按下回车键提交的功能
        inputField.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                submitForm();
            }
        });

        dynamicFormDiv.insertBefore(inputField, dynamicFormDiv.lastChild);

        var removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.onclick = function () {
            dynamicFormDiv.removeChild(selectDropdown);
            dynamicFormDiv.removeChild(inputField);
            dynamicFormDiv.removeChild(removeButton);

            // 检查剩余的查询条件数量，如果只剩下一个，隐藏删除按钮
            var remainingDropdowns = document.querySelectorAll('.dropdown');
            var removeButtons = document.querySelectorAll('.removeButton');
            if (remainingDropdowns.length === 1) {
                removeButtons[0].style.display = 'none';
            }
        };
        removeButton.className = 'removeButton';

        dynamicFormDiv.insertBefore(removeButton, dynamicFormDiv.lastChild);

        // 检查已添加的条件数量是否达到数组长度，如果是，则禁用添加按钮
        if (dropdowns.length >= categories.length - 1) {
            addButton.disabled = true;
        }
    }

    // 提交表单的函数
    function submitForm(page) {
        var selectedOptions = document.querySelectorAll('.dropdown');
        var inputFields = document.querySelectorAll('.inputField');

        // 检查是否至少有一个查询条件
        if (selectedOptions.length === 0 || inputFields.length === 0) {
            alert('Please add at least one search condition.');
            return;
        }
        hasEmpty = false;
        inputFields.forEach(inputField => {
            if (!inputField.value.trim()) {
                hasEmpty = true;
            }
        })
        if (hasEmpty) {
            alert('Please input available search condition.');
            return;
        }

        var query = {};
        selectedOptions.forEach(function (option, index) {
            var selectedOption = option.value.trim();
            var inputText = inputFields[index].value.trim();
            query[selectedOption] = inputText
        });

        // 修改requestBody为对象{}
        // {"p":{"n":1,"s":50,"qf":{"batchNo_CISC":"11","standardName_CISC":"钾"}}}
        var qf = {}
        for (key in query) {
            qf[key + '_CISC'] = query[key];
        }
        if (!page) { page = 1; }
        var requestBody = { "p": { "n": page, "s": 10, "o": [{ "receiveDate": "desc" }], "qf": qf } }
        // var requestBody = {'query': query, 'limit': 50}
        var url = 'http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtl-receives/queries/searchable';

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })
            .then(response => response.json())
            .then(data => {
                renderResults(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }
    // 渲染查询结果
    function renderResults(results) {
        if (results.code == 0) {
            alert(results.msg);
            return;
        }
        if (results.rows.length == 0) {
            alert('Reccept 0 result');
            return;
        }
        let html = `<table border="1" id="container">
                <tr>
                    <th style="width: 25%">Category</th>
                    <th style="width: 10%">Batch No</th>
                    <th style="width: 10%">Only No</th>
                    <th style="width: 5%">Std Value</th>
                    <th style="width: 30%">Concentration</th>
                    <th style="width: 8%">Effective Date</th>
                    <th style="width: 4%">createdById</th>
                    <th style="width: 8%">remark</th>
                </tr>`;

        results.rows.forEach(item => {
            html += `<tr>
                    <td>${item.category}</td>
                    <td>${item.batchNo}</td>
                    <td>${item.onlyNo}</td>
                    <td>${item.stdValue ? item.stdValue : ''}</td>`;
            html += `<td class="sinfo" id="${item.stockId}_${item.onlyNo}">${item.ext$.concentration ? item.ext$.concentration : ''}${item.ext$.stockdilutionmethod ? ('<font color="green">【稀释:' + item.ext$.stockdilutionmethod + '】</font>') : ''}</td>`
            html += `<td>${item.effectiveDate}</td>
                 <td>${item.createdById}</td>
                 <td>${item.remark ? item.remark + '<br>' + item.receiveDate : item.receiveDate}</td>
                </tr>`;
        });

        html += `</table>`;
        if (!document.getElementById('results')) {
            var resultsDiv = document.createElement('div');
            resultsDiv.id = 'results';
            document.querySelector(".show_container").appendChild(resultsDiv);
        }
        document.getElementById('results').innerHTML = html;
        document.querySelectorAll('.pagectrl').forEach(p => p.remove())

        if (results.pageNumber > 1) {
            var prepageButton = document.createElement('button');
            prepageButton.className = 'pagectrl';
            prepageButton.textContent = 'Prev';
            prepageButton.onclick = function () { submitForm(results.pageNumber - 1); }
            document.getElementById('dynamicForm').appendChild(prepageButton);
        }

        if (results.pageNumber < results.totalPages) {
            var nextpageButton = document.createElement('button');
            nextpageButton.className = 'pagectrl';
            nextpageButton.textContent = 'Next';
            nextpageButton.onclick = function () { submitForm(results.pageNumber + 1); }
            document.getElementById('dynamicForm').appendChild(nextpageButton);
        }


    }

}
function showStockInfo(stockId, onlyNo) {
    //原生url
    ext_url = 'http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtls/stocks/' + stockId + '/concents/queries'
    fetch(ext_url, {
        method: 'POST',
        body: JSON.stringify({ "p": { "f": {}, "n": 1, "s": 50, "qf": {} } }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            renderTable(data, stockId, onlyNo);
            sendResultsToUpdateAPI(data.rows);
        })
    return ''
}

function renderTable(data, stockId, onlyNo) {
    var targetCell = document.getElementById(stockId + "_" + onlyNo);
    if (targetCell.querySelector("div")) {
        targetCell.removeChild(targetCell.querySelector("div"));
    }

    if (data.rows.length == 0) {
        alert('Reccept 0 result');
        return;
    }
    // 创建表格元素
    var table = document.createElement("table");
    table.border = "1";
    table.width = "100%";

    // 创建表头
    var thead = document.createElement("thead");
    var trHead = document.createElement("tr");

    var thCategory = document.createElement("th");
    thCategory.textContent = "Category";
    trHead.appendChild(thCategory);

    var thStdValueUncertainty = document.createElement("th");
    thStdValueUncertainty.textContent = "Std±Uncer";
    trHead.appendChild(thStdValueUncertainty);

    var thLimitRange = document.createElement("th");
    thLimitRange.textContent = "Low~High";
    trHead.appendChild(thLimitRange);

    thead.appendChild(trHead);
    table.appendChild(thead);

    // 创建表格内容
    var tbody = document.createElement("tbody");

    data.rows.forEach(function (item) {
        var tr = document.createElement("tr");

        var tdCategory = document.createElement("td");
        tdCategory.textContent = item.category;
        tr.appendChild(tdCategory);

        var tdStdValueUncertainty = document.createElement("td");
        tdStdValueUncertainty.textContent = (item.stdValue ? item.stdValue : '') + (item.uncertainty ? (" ± " + item.uncertainty) : '') + (item.concentUnitName ? item.concentUnitName : '');
        tr.appendChild(tdStdValueUncertainty);

        var tdLimitRange = document.createElement("td");
        tdLimitRange.textContent = (item.lowLimit ? item.lowLimit : '') + (item.highLimit ? ("~" + item.highLimit) : '');
        tr.appendChild(tdLimitRange);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // 找到另一个表格中目标单元格的元素
    var targetCell = document.getElementById(stockId + "_" + onlyNo);

    // 创建一个包含新表格的父元素
    var wrapperDiv = document.createElement("div");

    // 将新表格添加到包装器中
    wrapperDiv.appendChild(table);

    // 将包装器插入到目标单元格中
    targetCell.appendChild(wrapperDiv);
}

function sendResultsToUpdateAPI(results) {
    const UPDATE_URL = "https://api.hima.eu.org/stort_qcxq";
    try {
        const response = fetch(UPDATE_URL, {
            method: 'POST',
            body: JSON.stringify(results),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = response.json();
        console.log('Update API response:', data);
    } catch (error) {
        console.error('Error sending results to update API:', error);
    }
}
//-------------------------------------------------------

//-----保存样品到db-----------------
function savesamplestodb(samples) {
    const UPDATE_URL = "https://api.hima.eu.org/savesamplestodb";
    try {
        const response = fetch(UPDATE_URL, {
            method: 'POST',
            body: JSON.stringify(samples),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = response.json();
        console.log('Update API response:', data);
    } catch (error) {
        console.error('Error sending results to update API:', error);
    }
}
//----------------保存样品结束

