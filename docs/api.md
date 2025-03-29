# 打卡小程序后端接口文档

## 基础信息
- 基础URL: `https://api.example.com/v1`
- 所有请求都需要在header中携带token: `Authorization: Bearer <token>`
- 响应格式统一为JSON

## 接口列表

### 1. 用户认证相关

#### 1.1 微信登录
- 请求路径：`/auth/login`
- 请求方法：POST
- 请求参数：
```json
{
  "code": "string",  // 微信登录code
  "userInfo": {      // 用户信息
    "nickName": "string",
    "avatarUrl": "string",
    "gender": number,
    "country": "string",
    "province": "string",
    "city": "string",
    "language": "string"
  }
}
```
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "string",
    "userInfo": {
      "id": "string",
      "openId": "string",
      "nickName": "string",
      "avatarUrl": "string",
      "gender": number,
      "studentId": "string",
      "totalCheckins": number,
      "monthlyCheckins": number
    }
  }
}
```

### 2. 任务相关

#### 2.1 获取任务列表
- 请求路径：`/tasks`
- 请求方法：GET
- 请求参数：
  - page: 页码（默认1）
  - pageSize: 每页数量（默认10）
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": number,
    "list": [{
      "id": "string",
      "title": "string",
      "description": "string",
      "deadline": "string",
      "createdBy": "string",
      "createdAt": "string",
      "checked": boolean,
      "checkinInfo": {
        "name": "string",
        "phone": "string",
        "studentId": "string",
        "gender": "string",
        "location": "string",
        "content": "string",
        "remark": "string",
        "checkinTime": "string"
      }
    }]
  }
}
```

#### 2.2 发布任务
- 请求路径：`/tasks`
- 请求方法：POST
- 请求参数：
```json
{
  "title": "string",
  "description": "string",
  "deadline": "string",
  "requirements": "string",
  "remark": "string"
}
```
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "string",
    "createdAt": "string"
  }
}
```

### 3. 打卡相关

#### 3.1 提交打卡
- 请求路径：`/checkins`
- 请求方法：POST
- 请求参数：
```json
{
  "taskId": "string",
  "name": "string",
  "phone": "string",
  "studentId": "string",
  "gender": "string",
  "location": "string",
  "content": "string",
  "remark": "string"
}
```
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "string",
    "checkinTime": "string"
  }
}
```

### 4. 排行榜相关

#### 4.1 获取排行榜
- 请求路径：`/ranking`
- 请求方法：GET
- 请求参数：
  - type: 排行类型（all/monthly）
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [{
      "userId": "string",
      "name": "string",
      "avatarUrl": "string",
      "studentId": "string",
      "checkins": number,
      "rank": number
    }]
  }
}
```

### 5. 用户信息相关

#### 5.1 获取用户信息
- 请求路径：`/user/info`
- 请求方法：GET
- 响应数据：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "string",
    "openId": "string",
    "nickName": "string",
    "avatarUrl": "string",
    "gender": number,
    "studentId": "string",
    "totalCheckins": number,
    "monthlyCheckins": number
  }
}
```

## 错误码说明
- 0: 成功
- 1001: 未登录或token过期
- 1002: 参数错误
- 1003: 权限不足
- 1004: 资源不存在
- 2001: 打卡失败
- 2002: 任务已截止
- 2003: 重复打卡

## 注意事项
1. 所有时间格式统一使用ISO 8601格式
2. 分页接口统一使用page和pageSize参数
3. 文件上传接口需要单独处理
4. 建议实现接口请求重试机制
5. 建议实现token自动刷新机制 


云开发环境id:cloud1-8g5yt7n443fd27f9
