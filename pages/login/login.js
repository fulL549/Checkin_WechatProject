// login.js
Page({
  data: {},

  onLoad() {
    // 检查是否已经登录
    const token = wx.getStorageSync('token');
    if (token) {
      this.redirectToIndex();
    }
  },

  handleLogin() {
    wx.showLoading({
      title: '登录中...',
    });

    // 获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        
        // 获取登录code
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 这里应该将code发送到后端服务器换取token
              // 模拟登录成功
              setTimeout(() => {
                wx.hideLoading();
                // 保存用户信息和token
                wx.setStorageSync('userInfo', userInfo);
                wx.setStorageSync('token', 'mock_token');
                
                wx.showToast({
                  title: '登录成功',
                  icon: 'success',
                  duration: 1500,
                  success: () => {
                    setTimeout(() => {
                      this.redirectToIndex();
                    }, 1500);
                  }
                });
              }, 1000);
            }
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  redirectToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
}); 