const cloud = require('../../utils/cloud')

Page({
  data: {
    loading: true,
    taskList: [],
    userInfo: null,
    refreshing: false
  },
  
  onLoad: function() {
    this.loadUserInfo()
    this.loadTaskList()
  },
  
  onShow: function() {
    // 页面显示时检查队长权限
    const isCaptain = wx.getStorageSync('isCaptain') || false
    if (!isCaptain) {
      wx.showModal({
        title: '提示',
        content: '您不是队长，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
    
    // 刷新任务列表
    this.loadTaskList()
  },
  
  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  },
  
  // 加载用户信息
  loadUserInfo: function() {
    const app = getApp()
    let userInfo = app.globalData.userInfo
    
    if (!userInfo) {
      userInfo = wx.getStorageSync('userInfo') || {}
      if (userInfo._openid) {
        app.globalData.userInfo = userInfo
      }
    }
    
    this.setData({ userInfo })
  },
  
  // 加载任务列表
  loadTaskList: function() {
    this.setData({ loading: true })
    
    if (!cloud || !cloud.task) {
      console.error('cloud module not properly loaded')
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      return
    }
    
    // 调用云函数获取所有任务
    cloud.task.getAllTasks()
      .then(result => {
        console.log('获取任务列表成功:', result)
        
        // 格式化任务数据
        const taskList = result.map(task => {
          // 格式化日期
          if (task.createdAt) {
            const date = new Date(task.createdAt)
            task.createdAtFormatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          }
          
          return task
        })
        
        this.setData({
          taskList,
          loading: false
        })
      })
      .catch(err => {
        console.error('获取任务列表失败:', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '加载任务失败',
          icon: 'none'
        })
      })
  },
  
  // 跳转到任务详情
  onTaskDetail: function(e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${taskId}`
    })
  },
  
  // 创建新任务
  onCreateTask: function() {
    wx.navigateTo({
      url: '/pages/task/task'
    })
  },
  
  // 编辑任务
  onEditTask: function(e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/task/task?id=${taskId}&edit=1`
    })
  },
  
  // 删除任务
  onDeleteTask: function(e) {
    const taskId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确认要删除该任务吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ loading: true })
          
          cloud.task.deleteTask(taskId)
            .then(() => {
              // 删除成功后，更新任务列表
              const taskList = this.data.taskList.filter(task => task._id !== taskId)
              
              this.setData({
                taskList,
                loading: false
              })
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
            })
            .catch(err => {
              console.error('删除任务失败:', err)
              this.setData({ loading: false })
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({ refreshing: true });
    this.loadTaskList()
      .then(() => {
        this.setData({ refreshing: false });
      })
      .catch(() => {
        this.setData({ refreshing: false });
      });
  }
}) 