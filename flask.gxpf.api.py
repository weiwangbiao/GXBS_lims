#!/usr/bin/python3
# encoding:utf-8
import datetime
import flask
import requests
import json
import pymongo
from flask_cors import CORS

# 实例化api，把当前这个python文件当作一个服务，__name__代表当前这个python文件
api = flask.Flask(__name__)
CORS(api, supports_credentials=True)

# 'index'是接口路径，methods不写，默认get请求     
@api.route('/', methods=['get'])
# get方式访问
def index():
    ren = {'msg': '成功访问首页', 'msg_code': 200}
    # json.dumps 序列化时对中文默认使用的ascii编码.想输出中文需要指定ensure_ascii=False
    return json.dumps(ren, ensure_ascii=False)


# post入参访问方式一：url格式参数
@api.route('/daan', methods=['get'])
def daan():
    # url格式参数?id=12589&name='lishi'
    key_w = flask.request.args.get('key_w').strip()
    ren = {}
    if len(key_w) > 0:
        ren['key_word'] = key_w
        myclient = pymongo.MongoClient(
            "mongodb://")
        db = myclient.gxpf
        ip = flask.request.remote_addr
        agent = flask.request.headers.get('User-Agent')
        referer = flask.request.headers.get('Referer')
        origin = flask.request.headers.get('Origin')
        v_times = 1
        visit = {'last_visit': datetime.datetime.now(), 'ip': ip, 'visit_times': v_times, 'agent': agent, 'referer': referer, 'origin': origin}
        collection_visitor = db.visitors
        is_old_visitor = collection_visitor.find_one({'ip': ip})
        if not is_old_visitor:
            collection_visitor.insert_one(visit)
        else:
            v_times = is_old_visitor['visit_times']
            collection_visitor.update_one({'ip': ip}, {"$set": {"visit_times": v_times+1}})
            collection_visitor.update_one({'ip': ip}, {"$set": {"last_visit": datetime.datetime.now()}})
            collection_visitor.update_one({'ip': ip}, {"$set": {"agent": agent}})
            collection_visitor.update_one({'ip': ip}, {"$set": {"referer": referer}})
            collection_visitor.update_one({'ip': ip}, {"$set": {"origin": origin}})
        collection = db.tiku
        results = collection.find({'subjectName': {'$regex': key_w}}).limit(10)
        subjectItems = []
        for i in results:
            subjectItems.append({'subjectName':i['subjectName'], 'idNames': i['idNames']})
            if len(subjectItems) >= 10:
                break
        ren.update({'subjectItems':subjectItems})
        if len(subjectItems)>0:
            ren['msg_code'] = 200
        else:
            ren.clear()
            ren = {'msg': '无结果', 'msg_code': -1}
        ren.update({'visit_times': v_times})
    else:
        ren = {'msg': '请输入关键字', 'msg_code': -1}

    return json.dumps(ren, ensure_ascii=False)


# post入参访问方式二：from-data（k-v）格式参数
@api.route('/login', methods=['post'])
def login():
    # from-data格式参数
    usrname = flask.request.values.get('usrname')
    pwd = flask.request.values.get('pwd')

    if usrname and pwd:
        if usrname == 'test' and pwd == '123456':
            ren = {'msg': '登录成功', 'msg_code': 200}
        else:
            ren = {'msg': '用户名或密码错误', 'msg_code': -1}
    else:
        ren = {'msg': '用户名或密码为空', 'msg_code': 1001}
    return json.dumps(ren, ensure_ascii=False)


# post入参访问方式二：josn格式参数
@api.route('/loginjosn', methods=['post'])
def loginjosn():
    # from-data格式参数
    usrname = flask.request.json.get('usrname')
    pwd = flask.request.json.get('pwd')

    if usrname and pwd:
        if usrname == 'test' and pwd == '123456':
            ren = {'msg': '登录成功', 'msg_code': 200}
        else:
            ren = {'msg': '用户名或密码错误', 'msg_code': -1}
    else:
        ren = {'msg': '用户名或密码为空', 'msg_code': 1001}
    return json.dumps(ren, ensure_ascii=False)

@api.route('/stort_qc', methods=['POST'])
def stort_qc():
    try:
        # MongoDB 连接信息
        mongo_uri = "mongodb://"
        database_name = "GXSTHJ_LIMS"
        collection_name = "zhikongyang"

        # 连接 MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[database_name]
        collection = db[collection_name]

        
        # 获取请求数据
        stocks = flask.request.get_json()
        print('ok')
        for stock in stocks:
            print(stock)
            query = {'onlyNo': stock['onlyNo'], 'id': stock['id']}
            update = {"$set": stock}
            result = collection.find_one_and_update(query, update, upsert=True)
        return {'msg':'OK'}
    except:
        return {'msg':'Error'}

@api.route('/test', methods=['POST'])
def test():
    try:
        # MongoDB 连接信息
        mongo_uri = "mongodb://"
        database_name = "GXSTHJ_LIMS"
        collection_name = "zhikongyang"

        # 连接 MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[database_name]
        collection = db[collection_name]

        # 获取请求数据
        request_data = flask.request.get_json()
        query = request_data.get('query')
        limit_quanty = request_data.get('limit')
        # 构建复合查询条件
        q = {}
        for key,value in query.items():
            q[key] = {'$regex': value, "$options": "i"}

        # 查询数据库
        results = list(collection.find(q).sort('onlyNo', -1).limit(limit_quanty))

        # 移除结果中的 _id 字段
        for result in results:
            result.pop('_id')

        # 将查询结果转换为 JSON 格式
        json_results = {'code': 200, 'rows': results, 'query':query ,'limit_quanty':limit_quanty }

        return  json_results
    except:
        return {'code': 0, 'msg': 'Something went wrong.'}



@api.route('/search_qc', methods=['POST'])
def search_qc():
    try:
        # MongoDB 连接信息
        mongo_uri = "mongodb://"
        database_name = "GXSTHJ_LIMS"
        collection_name = "zhikongyang"

        # 连接 MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[database_name]
        collection = db[collection_name]

        # 获取请求数据
        request_data = flask.request.get_json()
        query = request_data.get('query')
        limit_quanty = request_data.get('limit')
        # 构建复合查询条件
        q = {}
        for key,value in query.items():
            q[key] = {'$regex': value, "$options": "i"}

        # 查询数据库
        results = list(collection.find(q).sort('onlyNo', -1).limit(limit_quanty))

        # 移除结果中的 _id 字段
        for result in results:
            result.pop('_id')

        # 将查询结果转换为 JSON 格式
        json_results = {'code': 200, 'rows': results, 'query':query ,'limit_quanty':limit_quanty }

        return  json_results
    except:
        return {'code': 0, 'msg': 'Something went wrong.'}

@api.route('/stort_qcxq', methods=['POST'])
def stort_qcxq():
    try:
        # MongoDB 连接信息
        mongo_uri = "mongodb://"
        database_name = "GXSTHJ_LIMS"
        collection_name = "zhikongyangxiangqing"

        # 连接 MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[database_name]
        collection = db[collection_name]

        
        # 获取请求数据
        stocks = flask.request.get_json()

        for stock in stocks:
            query = {'stockId': stock['stockId'], 'category': stock['category']}
            update = {"$set": stock}
            result = collection.find_one_and_update(query, update, upsert=True)
        return {'msg':'OK'}
    except:
        return {'msg':'Error'}


@api.route('/search_qcxq', methods=['POST'])
def search_qcxq():
    try:
        # MongoDB 连接信息
        mongo_uri = "mongodb://"
        database_name = "GXSTHJ_LIMS"
        collection_name = "zhikongyangxiangqing"

        # 连接 MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client[database_name]
        collection = db[collection_name]

        # 获取请求数据
        data = flask.request.get_json()

        # 从请求数据中提取下拉框和输入框的值
        stockId = data.get('stockId')

        # 构建查询条件
        query = {'stockId': stockId}
        # print(query)

        # 查询数据库
        results = list(collection.find(query))
        for result in results:
            result.pop('_id')
        #print(results)

        # 将查询结果转换为 JSON 格式
        json_results = {'code': 200, 'rows': results}

        return  json_results
    except:
        return {'code': 0, 'msg': 'Something went wrong.'}

    
if __name__ == '__main__':
    api.run(port=8888, debug=True, host='0.0.0.0')  # 启动服务
    # debug=True,改了代码后，不用重启，它会自动重启
    # 'host='127.0.0.1'别IP访问地址
