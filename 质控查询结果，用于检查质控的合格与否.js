fetch('http://59.211.223.38:8080/secure/emc/module/bp/bp/order-task-results/queries/run-result',{
                        method: 'POST',
                        body: JSON.stringify({
                          "p":{
                            "f":{
                              "projId":1204735633489984 //从任务号查询达到projId
                            },
                            "n":-1,
                            "s":50,
                            "qf":{
                              "resultStatus_IN":"OOS" //代表不合格，‘done’代表合格
                            }
                          }
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                        .then(response => response.json())
                        .then(data => {console.log(data.rows)})



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
