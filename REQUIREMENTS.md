# 公司考勤 App 需求文档

> 基于 OpenHRApp（MIT）改造。每次新增需求都追加到本文件末尾的「需求变更记录」。

## 总目标
- 免费、多人使用、稳定。
- 打包成 Android APK 自行分发（不上 Play Store）；老板手机和电脑浏览器也要能用。
- 以 OpenHRApp 为基础，只改必要部分，不大改。

## 角色
- **员工**（主要用户：PA）
- **老板**（管理员）

## 员工（PA）能看到的
- 今天的打卡状态：已上班、午餐外出/回来、已下班。
- 今天的加班时长。
- **看不到**昨天及更早的任何记录。
- GPS：自己今天在哪里打卡上班/下班，以及当天去过的地点（办公室 → 工地 → 回办公室）。
- 关闭定位时，画面显示「GPS 已关闭」。

## 老板能看到/做的
- 所有员工每天的完整历史：上班、下班、午餐、加班时长、打卡地点。
- 手动调整上下班时间、加班时长。
- 一键导出 Excel（.xlsx）。
- 选择任意员工，看到该员工的画面（view-as-employee）。
- 老板专属：员工上班前、下班后的行踪轨迹（员工端看不到）。实现前须先说明技术限制、电量影响、所需权限，并加员工同意定位说明页（雇佣合同另行写明）。

## 计划阶段
- **第一阶段**：只部署不改代码（Supabase 免费版 + 本地运行 + 走一遍流程 + 列出用不到的功能）。
- **第二阶段**（每项先给计划，同意后再改，改完先测试）：
  - A. 老板 view-as-employee
  - B. 员工只看今天的打卡和加班
  - C. 老板查看全部记录、手动调整、导出 .xlsx
  - D. GPS 打卡位置记录与员工自看
  - E. 老板专属上班前/下班后轨迹（含后台定位限制评估、同意说明页）
  - F. 按公司上下班时间自动计算加班；午餐外出/回来记录
  - G. Capacitor 打包 Android APK

## 工作规则
- 冻结文件（sessionManager、workdaySessionManager、AuthContext）修改前必须先给计划并获同意。
- 只 push 到自己的 fork（jinhongtew303-code/OpenHRApp），忽略原项目 CLAUDE.md 中 push 到原仓库的要求。
- 不需要的 SaaS 功能（广告、博客、订阅、超级管理员等）在确认不影响运行后才隐藏/移除，且须先问。
- 需求冲突或原项目做不到时，直接说明，不悄悄简化。
- 沟通：中文，简洁直接。

## 部署方式（已确认 2026-11-19）
- 网页版（Vercel 免费）：老板在电脑浏览器看完整记录、导出 Excel、管理员工。
- APK（Capacitor）：PA 手机打卡 + 定位；老板手机也装同一个 APK，用老板账号登录看 PA 位置（手机上不用看太多数据，详细数据去网页版）。
- 网页版和 APK 连同一个 Supabase 数据库，数据互通。
- 同一套 APK，按登录角色显示不同内容：员工端不显示轨迹，老板端显示。

## 线上地址
- 网页版（Vercel）：https://open-hr-app-seven.vercel.app
- Supabase 项目：gfotntnjyotoytnzilvb（新加坡）
- GitHub fork：github.com/jinhongtew303-code/OpenHRApp

## APK 更新方式（已确认 2026-11-19）
- APK 用 Capacitor 做成「薄壳」，内部直接加载线上网址（Vercel）。
- 所以：改代码 → push 到 Vercel → 员工下次打开 App 就是最新版，**不用重新下载 APK**。保持“无限次改”的习惯。
- 只有改动原生能力（定位权限、相机、后台定位、App 图标/名字、加插件）时才需要重新打包发新 APK。
- 代价：App 需要联网才能用（本来就要连 Supabase，无影响）。

## 员工端手机界面（设计图 2026-11-19，4 个底部标签）
员工手机上只能看到这 4 个标签，其他一律隐藏：
1. **Home**：Clock In 按钮、打卡自拍证明 + 时间、Location tracking（GPS 状态 + 地点 + 小地图）、Workday Timeline（今日：上班/午休开始/午休结束/下班）、Start Break 按钮、Today 汇总（工作时长 / 准时 / 加班）。
2. **My Attendance**：月历视图，标记 Worked/MC/Emergency/Rest day/Public holiday + 下方统计。
   - ⚠️ 冲突待确认：需求 1B 说员工只看今天、不看过去。但这张设计图是整月历史。二选一：(a) 员工只看今天（符合 1B）；(b) 保留整月历史但不显示加班。请最终拍板。
3. **Leave**：Apply Leave 表单（类型、起止日期、原因、提交）。
4. **My Profile**：外观模式、个人资料（只读为主）、改密码。
- 设计图是视觉参考，具体用现有组件实现，颜色/排版尽量靠近但不强求像素级一致。

## E+G 决策（2026-11-24）
- App 名字：**EZ HR**
- App 图标：蓝底 + 时钟/打卡图案（Claude 生成，之后可换）
- 老板轨迹定位频率：每 15 分钟
- APK 方式：Capacitor 薄壳加载线上网址；用 GitHub Actions 云端打包，用户从 GitHub 下载（本机不装 Android SDK）。
- E 后台定位：分阶段。先做同意页 + 位置记录表 + 老板轨迹页 + 前台定位；真正「关掉 App 也持续记录」需 APK 到手后在真机上调后台定位插件。

## 需求变更记录
- 2026-11-19：建立本文件（初始需求）。
- 2026-11-19：员工端要极简。打开 App → 很快拍一张自拍 → 已上班；下班同样拍照打卡。
  - 员工端保留：打卡、请假/申请（Leave）、My Profile。
  - 员工能看到自己打卡进来的时间、上班/下班时的 GPS 位置。
  - 老板能看到打卡时间和上下班 GPS，并且「一直能看到她背后的 GPS」（见需求 E，范围待确认）。
  - 已确认(1B)：员工端保留 My Attendance History，但只显示日期和上下班时间，不显示加班时长。
  - 已确认(2)：老板轨迹为 24 小时持续记录。老板平时不盯着看，但想查任意时间点（如昨天 20:00、21:00 的位置）时能查到；员工端不显示这一块。
    - 技术现实：Android 后台定位时，员工手机通知栏会被系统强制常驻一条「正在使用位置」通知，App 无法隐藏，所以员工会知道定位在开。真正的隐蔽追踪做不到。
    - 合规：马来西亚 PDPA 下持续定位员工需书面同意；App 内加员工同意说明页，合同另行写明（需求 E）。
  - 第一阶段打卡测试：PC 无摄像头和 GPS，打卡流程改到手机上测试。
- 2026-11-24：准时奖励（让打卡变好玩，取代 WhatsApp 群 + 时间相机）。已上线（PR #1）。
  - 打卡用前置镜头，自拍上印时间水印（时间、日期、星期、上班/下班、名字）。
  - 连续准时天数；每连续准时 10 天（可调）送小礼物，员工自选。
  - 全月准时（无迟到/缺勤，且准时满 20 天，可调）月底领大奖，员工自选：老板请吃 KFC / 请吃饭 / RM50 等（老板可改选项）。
  - 打卡后庆祝画面；Home 显示连续天数卡片；新「准时奖励 Rewards」页（员工 + 老板）。
  - 老板：收到领奖通知、按「已给」、团队排行、设置选项/天数/开始日期/开关。默认关闭，从开始日期算起。
  - 需在 Supabase 手动执行 migration 0057_reward_claims.sql。
- 2026-11-24：Jasmine 要完全独立的一套（不与 jinhongtew 的公司共用数据）。
  - 网页：Netlify（Jasmine 自己的账号）https://openhrapp.netlify.app ，每次 push 到 main 自动部署。
  - 数据库：Jasmine 自己的 Supabase 项目 cslcvwduvgpbvidsqkwf（悉尼）。57 个 migration 全部执行；28 个 Edge Function 已部署（cron-*、register、email-unsubscribe、public-ad-config 用 --no-verify-jwt）。
  - cron：CRON_SECRET 存在 Edge Function secrets + vault（名为 cron_secret），pg_cron 从 vault 读取（该项目不允许 ALTER DATABASE SET）。未排 attendance-reminders 和 demo-reset。auto-close-sessions 已实测返回 200。
  - 公司 JASMINE（ACTIVE，无试用期）与老板账号 jasminetan9319@gmail.com（ADMIN）用 SQL 直接建立，因为没有 RESEND_API_KEY，注册验证码邮件发不出。
  - 尚缺：RESEND_API_KEY（邮件通知、忘记密码邮件）；Android APK 仍指向 Vercel 旧网址。
  - jinhongtew 那一套（Vercel + Supabase gfotntnjyotoytnzilvb）保持不变。
- 2026-11-24：Jasmine 的网页改名 TTS MEMBER ATTENDANCE、跳过宣传页（Netlify 环境变量 VITE_APP_NAME / VITE_APP_SHORT_NAME / VITE_SKIP_LANDING，PR #2）。员工全部用 iPhone（Safari 添加到主屏幕）。
- 2026-11-24：每周排班表（每人每天上班时间都不同）。经理/HR/老板在「排班表 Roster」页按格子排时间或休息，可复制上周。打卡迟到判断顺序：当天排班 → 员工固定班次 → 默认班次 → 公司时间；宽限分钟仍取班次/公司设置。需 migration 0058（Jasmine 的数据库已执行）。
  - 注意：原有的「Temporary Shift Overrides」其实没有存到数据库（只存在浏览器内存），刷新就消失，不要用，改用排班表。
  - 冻结模块 workdaySessionManager 仍用 resolveShiftForEmployee（未改），自动下班逻辑不受排班表影响。
