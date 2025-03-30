// 云开发工具类
const cloud = {
  // 通用云函数调用方法（带重试）
  callFunction: function(name, data, maxRetries = 1) {
    let retries = 0;
    
    const call = function() {
      return new Promise((resolve, reject) => {
        console.log(`调用云函数: ${name}, 参数:`, data);
        wx.cloud.callFunction({
          name: name,
          data: data
        })
        .then(res => {
          // 不管返回什么结果，统一认为是成功的，交给业务逻辑处理
          if (res.result) {
            resolve(res.result.data);
          } else {
            console.warn(`云函数 ${name} 返回空结果`);
            resolve(null);
          }
        })
        .catch(err => {
          console.error(`云函数 ${name} 调用异常:`, err);
          if (retries < maxRetries) {
            retries++;
            console.log(`重试 ${name} (${retries}/${maxRetries})...`);
            // 等待一段时间再重试
            setTimeout(() => {
              call().then(resolve).catch(reject);
            }, 300);
          } else {
            // 为避免影响用户体验，返回null而不是报错
            console.log('达到最大重试次数，返回空结果');
            resolve(null);
          }
        });
      });
    };
    
    return call();
  },

  // 任务相关
  task: {
    // 创建任务
    createTask: function(data) {
      return module.exports.callFunction('task', {
        type: 'create',
        data: data
      }, 1);
    },

    // 获取任务列表
    getTaskList: function(page = 1, pageSize = 10) {
      return module.exports.callFunction('task', {
        type: 'list',
        page,
        pageSize
      }, 1);
    },
    
    // 获取任务详情
    getTaskDetail: function(taskId) {
      return module.exports.callFunction('task', {
        type: 'detail',
        taskId: taskId
      }, 1);
    },
    
    // 加入任务
    joinTask: function(taskId) {
      if (!taskId) {
        return Promise.reject(new Error('任务ID不能为空'));
      }
      
      return module.exports.callFunction('task', {
        type: 'join',
        taskId
      }, 1);
    },
    
    // 获取所有任务
    getAllTasks: function() {
      return module.exports.callFunction('task', {
        type: 'getAll'
      }, 1);
    },
    
    // 更新任务
    updateTask: function(data) {
      return module.exports.callFunction('task', {
        type: 'update',
        data: data
      }, 0);
    },
    
    // 删除任务
    deleteTask: function(taskId) {
      return module.exports.callFunction('task', {
        type: 'delete',
        taskId: taskId
      }, 0);
    }
  },

  // 打卡相关
  checkin: {
    // 提交打卡
    submitCheckin: function(data) {
      return module.exports.callFunction('checkin', {
        type: 'submit',
        data: data
      }, 1);
    },

    // 获取排行榜
    getRanking: function(type = 'all') {
      return module.exports.callFunction('checkin', {
        type: 'ranking',
        rankingType: type
      }, 1);
    },

    // 获取用户统计数据
    getUserStats: function() {
      return module.exports.callFunction('checkin', {
        type: 'userStats'
      }, 2);  // 统计数据允许重试2次
    },

    // 获取用户打卡历史
    getUserHistory: function(page = 1, pageSize = 10) {
      return module.exports.callFunction('checkin', {
        type: 'userHistory',
        page,
        pageSize
      }, 1);
    },
    
    // 获取打卡记录详情
    getCheckinDetail: function(recordId) {
      return module.exports.callFunction('checkin', {
        type: 'getRecord',
        recordId
      }, 1);
    }
  },

  // 用户相关
  user: {
    // 创建或更新用户
    createUser: function(userData) {
      // 确保userData中包含需要的额外字段
      const data = {
        ...userData,
        // 添加或保留这些字段
        nickName: userData.nickName || '',
        avatarUrl: userData.avatarUrl || '',
        studentId: userData.studentId || '',
        gender: userData.gender || 'male',
        birthday: userData.birthday || '',
        phone: userData.phone || ''
      };
      
      return module.exports.callFunction('user', {
        type: 'create',
        data: data
      }, 1);
    },

    // 获取用户信息
    getUser: function(openId) {
      return module.exports.callFunction('user', {
        type: 'get',
        openId: openId
      }, 1);
    }
  }
};

module.exports = cloud 