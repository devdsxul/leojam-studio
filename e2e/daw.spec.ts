import { test, expect } from '@playwright/test'

test.describe('leojam studio DAW 端到端测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('欢迎页面显示正常', async ({ page }) => {
    // 验证欢迎页元素
    await expect(page.locator('.welcome-screen')).toBeVisible()
    await expect(page.locator('.welcome-logo')).toContainText('leojam studio')
    await expect(page.locator('.start-button')).toBeVisible()
    await expect(page.locator('.features-grid')).toBeVisible()
  })

  test('点击开始按钮进入DAW界面', async ({ page }) => {
    // 点击开始按钮
    await page.click('.start-button')

    // 验证主界面元素加载
    await expect(page.locator('.app-container')).toBeVisible()
    await expect(page.locator('.header')).toBeVisible()
    await expect(page.locator('.toolbar')).toBeVisible()
  })

  test('DAW 主界面布局完整', async ({ page }) => {
    await page.click('.start-button')

    // 验证侧边栏 Browser
    await expect(page.locator('.sidebar .browser')).toBeVisible()

    // 验证主工作区
    await expect(page.locator('.workspace')).toBeVisible()

    // 验证默认显示 Playlist
    await expect(page.locator('.playlist')).toBeVisible()
  })

  test('视图切换功能正常', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 使用快捷键切换到 Piano Roll (2)
    await page.keyboard.press('2')
    await expect(page.locator('.piano-roll')).toBeVisible()

    // 切换到 Step Sequencer (3)
    await page.keyboard.press('3')
    await expect(page.locator('.step-sequencer')).toBeVisible()

    // 切换到 Mixer (4)
    await page.keyboard.press('4')
    await expect(page.locator('.mixer')).toBeVisible()

    // 切换到 Automation (6)
    await page.keyboard.press('6')
    await expect(page.locator('.automation-panel')).toBeVisible()

    // 切换回 Playlist (1)
    await page.keyboard.press('1')
    await expect(page.locator('.playlist')).toBeVisible()
  })

  test('Transport 控制功能正常', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 验证 Transport 播放按钮存在
    await expect(page.locator('.play-btn')).toBeVisible()

    // 使用空格键播放
    await page.keyboard.press('Space')

    // 验证播放状态变化（按钮添加 playing 类）
    await expect(page.locator('.play-btn.playing')).toBeVisible()

    // 使用 Enter 停止
    await page.keyboard.press('Enter')
    await expect(page.locator('.play-btn:not(.playing)')).toBeVisible()
  })

  test('Mixer 通道显示正常', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 切换到 Mixer
    await page.keyboard.press('4')
    await expect(page.locator('.mixer')).toBeVisible()

    // 验证主通道存在
    await expect(page.locator('.mixer-channel.master')).toBeVisible()

    // 验证轨道通道存在（至少2个默认轨道）
    const channels = await page.locator('.mixer-channel:not(.master)').count()
    expect(channels).toBeGreaterThanOrEqual(2)

    // 验证推子控件存在
    await expect(page.locator('.fader').first()).toBeVisible()
  })

  test('Automation 界面功能正常', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 切换到 Automation
    await page.keyboard.press('6')
    await expect(page.locator('.automation-panel')).toBeVisible()

    // 验证添加自动化按钮
    await expect(page.locator('.add-lane-btn')).toBeVisible()

    // 点击添加自动化按钮
    await page.click('.add-lane-btn')

    // 验证弹窗显示
    await expect(page.locator('.add-lane-modal')).toBeVisible()

    // 关闭弹窗
    await page.click('.btn-cancel')
    await expect(page.locator('.add-lane-modal')).not.toBeVisible()
  })

  test('Browser 标签页切换正常', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 验证 Browser 标签
    const tabs = page.locator('.browser-tabs .tab')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(4)

    // 点击不同标签验证切换
    await tabs.first().click()
    await expect(tabs.first()).toHaveClass(/active/)
  })

  test('Piano Roll 视图可切换', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 切换到 Piano Roll
    await page.keyboard.press('2')
    await expect(page.locator('.piano-roll')).toBeVisible()

    // 未选择 Pattern 时显示提示
    await expect(page.locator('text=未选择 Pattern')).toBeVisible()
  })

  test('Step Sequencer 视图可切换', async ({ page }) => {
    await page.click('.start-button')
    await page.waitForSelector('.app-container')

    // 切换到 Step Sequencer
    await page.keyboard.press('3')
    await expect(page.locator('.step-sequencer')).toBeVisible()

    // 无 Pattern 时显示创建提示
    await expect(page.locator('text=暂无鼓机 Pattern')).toBeVisible()
    await expect(page.locator('text=创建 Pattern')).toBeVisible()
  })
})
