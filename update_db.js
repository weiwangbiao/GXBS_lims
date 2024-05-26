//通过orgId_SEQ、onlyNo_CISC获取质控样基本信息，得到data,data.rows里面是质控样列表，包含batchNo createdById ext$.concentration
fetch('http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtl-receives/queries/searchable', {
        method: 'POST',
        body: JSON.stringify({"p":{"f":{"orgId_SEQ":"101009","parentId":"1"},"n":1,"s":50,"qf":{"onlyNo_CISC":"20240709"}}}), //"orgId_SEQ":"101009"代表百色，从1-14
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json()).then(data=>console.log(data))



//如果ext$.concentration 或者stdValue无数据，则获取详细数据储蓄到db中
function getQc(selectedOption, inputText, limit) {
    fetch('http://gxpf.hima.eu.org:8888/search_qc', {
            method: 'POST',
            body: JSON.stringify({'requestBody':[{"selectedOption":selectedOption,"inputText":inputText}],'limit':limit),
            headers: {'Content-Type': 'application/json'}
        })
        .then(response => response.json())
        .then(data=>deal(data))
}

function deal(datas){
    if(datas.code==200&&datas.rows.lenght>0){
        datas.forEach(function(item) {
            if(!item.ext$.concentration&&!item.stdValue) {
                getqcxq(item.stockId)
            }
            })        
    }
}

function getqcxq(stockId) {
    fetch('http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtls/stocks/'+stockId+'/concents/queries', {
        method: 'POST',
        body: JSON.stringify({"p":{"f":{},"n":1,"s":50,"qf":{}}}),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data=>stort_qcxq(data.rows))   
}

 
function stort_qcxq(data){
    fetch('http://gxpf.hima.eu.org:8888/stort_qcxq', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data=>console.log(data))
}



 
        
        
//------------------查最新50条信息---存储到db----
function stort_qc(data){
    fetch('http://gxpf.hima.eu.org:8888/stort_qc', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data=>console.log(data))
}

const orgIds = ["101001", "101002", "101003", "101004", "101005", "101006", "101007", "101008", "101009", "101010", "101011", "101012", "101013", "101014"];
const url = "http://59.211.223.38:8080/secure/emc/module/mdm/basemdm/mtl-receives/queries/searchable";
const payloadTemplate = {
  "p": {
    "f": {
      "orgId_SEQ": null,
      "parentId": "1"
    },
    "n": 1,
    "s": 50,
    "qf": {},
    "o": [{"receiveDate": "desc"}]
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
      console.log(data.rows); // 打印每个请求的响应数据中的 rows 字段
      // 将当前请求的 rows 字段合并到总的 rows 数组中
      rows.push(...data.rows);
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
  allRows = allRows.filter(i=>i.onlyNo); //去除onlyNo为空的数据
  stort_qc(allRows); //存储到db
}

sendInBatches(orgIds.slice(), batchSize, concurrentRequests);

//----------------------------------------