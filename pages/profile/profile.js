Page({
  data: {
    userInfo: {
      name: '张三',
      studentId: '2024001',
      gender: 'male',
      totalCheckins: 25,
      monthlyCheckins: 8
    }
  },

  onLoad() {
    // 这里可以添加获取用户信息的逻辑
  },

  navigateToTask() {
    wx.navigateTo({
      url: '/pages/task/task'
    });
  }
}); 