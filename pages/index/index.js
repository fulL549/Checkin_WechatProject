// index.js
Page({
  data: {
    tasks: [
      {
        id: 1,
        title: '每日晨会',
        description: '早上9点进行团队晨会，汇报工作进度',
        deadline: '2024-03-28',
        checked: false
      },
      {
        id: 2,
        title: '项目周报',
        description: '提交本周项目进度报告',
        deadline: '2024-03-29',
        checked: true,
        checkinInfo: {
          name: '张三',
          phone: '13800138000',
          remark: '已完成本周工作内容',
          checkinTime: '09:30'
        }
      }
    ]
  },

  handleTaskClick(e) {
    const task = e.currentTarget.dataset.task;
    wx.navigateTo({
      url: '/pages/checkin/checkin?taskId=' + task.id + '&isChecked=' + task.checked
    });
  }
});
