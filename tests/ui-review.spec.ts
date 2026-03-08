import { test, expect, chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

test.use({
  extraHTTPHeaders: { 'x-playwright-test': '1' }
})

// Helper to set auth cookie so we bypass login
async function goToPage(page: any, url: string) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1500)
}

test('Login page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }) // iPhone 14 Pro
  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login.png`, fullPage: true })
})

test('Today tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/today`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-today.png`, fullPage: true })
})

test('Move tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/move`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-move.png`, fullPage: true })
})

test('Wellness tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/wellness`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-wellness.png`, fullPage: true })
})

test('Eat tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/eat`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-eat.png`, fullPage: true })
})

test('Mind tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/mind`)
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-mind.png`, fullPage: true })
})

test('Habits tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/habits`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-habits.png`, fullPage: true })
})

test('Settings tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/settings`)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-settings.png`, fullPage: true })
})
