fetch('http://59.211.223.38:8080/secure/emc/module/bp/project/projects/queries',{
                        method: 'POST',
                        body: JSON.stringify({
                          "p":{
                            "f":{
                              "targetType":"projEdit",
                              "taskStatus_SEQ":"normal",
                              "orgId_SEQ":"101009"
                            },
                            "n":1,
                            "s":50,
                            "qf":{
                              "projNo_CISC":"百环监（测试2）2023026号"
                            }
                          }
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                          console.log(data.rows)
                          data.rows.forEach(row=>{
                          runResult(row.id,'OOS')
                          })
                        })
/**************************结果如下：****************************
[
  {
    "allegationReq": "参加监测采样和测试的人员，均按照国家规定持证上岗，监测分析方法优先使用国家分析标准，监测分析仪器经检定/校准合格，并在有效期内。监测数据和技术报告实行三级审核制度",
    "basicInfo": "稀土工业污染物排放标准中表2、表3",
    "bizCategoryCode": "CS2",
    "bizCategoryId": 739193712836672,
    "compleDate": "2023-09-01",
    "createdById": "黄玲",
    "createdByName": "黄玲",
    "createdByOrgId": "10100902",
    "createdByOrgName": "总工室",
    "createdTime": "2023-08-29",
    "entrustOrgId": "1175149786259520",
    "entrustOrgName": "百色百矿发电有限公司",
    "ext$": {
      "bizcategoryname": "测试任务（自送样）",
      "formstyle": "form2",
      "projectorgname": "广西壮族自治区百色生态环境监测中心",
      "editmonitorinfo": "1",
      "createdparentorgid": "101009"
    },
    "id": 1204735633489984,
    "monitorType": "1",
    "orgId": "101009",
    "processStatus": "done",
    "projName": "稀土工业污染物排放标准（水）",
    "projNo": "百环监（测试2）2023026号",
    "projNode": "报告编制中",
    "registDate": "2023-08-29",
    "remark": "/",
    "reportEditUser": "黄小璎",
    "reportEditUserid": "黄小璎",
    "reportType": "3",
    "sample": "0",
    "status": "reportEdit",
    "taskDate": "2023-08-29",
    "taskStatus": "normal"
  }
]
*************************************************************/
function runResult(projId,resultStatus='OOS') {
fetch('http://59.211.223.38:8080/secure/emc/module/bp/bp/order-task-results/queries/run-result',{
                        method: 'POST',
                        body: JSON.stringify({
                          "p":{
                            "f":{
                              "projId":projId //从任务号查询达到projId
                            },
                            "n":-1,
                            "s":50,
                            "qf":{
                              "resultStatus_IN":resultStatus //代表不合格，‘done’代表合格
                            }
                          }
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                        .then(response => response.json())
                        .then(data => {console.log(data.rows)})

}

/**************************结果如下：****************************
[
    {
        "ext$": {
            "cupno": "1",
            "testname": "总氮",
            "ordercontainerid": "1204841506136128",
            "ordercontainerno": "A2023082900180"
        },
        "id": 1204841506267202,
        "itemName": "总氮",
        "orderNo": "A00044848001",
        "orderTaskId": 1204841506250816,
        "qcCategoryCode": "L-BLANK",
        "qcName": "实验室空白",
        "reportResult": "0.17",
        "resultStatus": "OOS",
        "runId": "20230829071"
    }
]
*************************************************************/
