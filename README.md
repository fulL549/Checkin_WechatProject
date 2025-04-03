# 项目介绍
微信打卡小程序介绍：
每个用户第一次使用需要创建一个账号有自己的个人基本信息
用户可在小程序中进行打卡
后台管理员可以观察到打卡的信息（包括用户、时间等）
同时可以在后台对信息进行增删改查等操作

要求：
1.你是一个经验丰富的UI工程师，设计风格简介明朗
2.已经初始化好了微信小程序的项目目录，在项目下进行代码填充
3.小程序的界面有一个任务发布，还有一个可以打卡的按钮
4.用户可以点击按钮进行打卡，填写个人信息

用户的个人设置界面，从上到下依次是:
1.基本信息：姓名、学号、性别、学院、年级
2.队员信息：ID、队员状态、测试水平、左右桨、入队时间、参赛记录
3.其他信息设置：密码、生日、身高、体重、手机号
其中,请重新调整密码的显示样式

请调整用户注册的逻辑，用户注册时不再分配openid字段
之前的代码中有openid和id两个字段，请删除openid字段
只保留id字段，并且user的所有相关数据不再与openid有联系

修改用户id的获取方式，不使用随时的数字，而是用按照注册时间顺序的编号，从1开始

打卡task设计
1.时间选项：第1-18周/寒训/暑训
2.类型选项：非集训/集训上午/集训下午
3.设置打卡时间：修改现有的截止日期，改成设置打卡起始时间设置和打卡截止时间设置

打卡checkin设计
要求：修改现有的提交打卡内容，改为以下内容

类型选择“非集训”时的打卡内容：
1.训练动作一：
  训练内容：
2.训练动作二：
  训练内容：    
3.训练动作三：
  训练内容：
4.训练动作四：
  训练内容：
5.训练动作五：
  训练内容：
6.训练动作六：
  训练内容：
7.备注信息：
8.添加图片凭证：

打卡类型选择"集训上午"或者"集训下午"时的打卡内容：
1.训练内容：
2.备注信息：
3.添加图片凭证：

并且每一次填写打卡能够自动获取用户的详细定位，范围在