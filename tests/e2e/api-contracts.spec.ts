import { test, expect } from './fixtures'

test.describe('API Contracts', () => {
  test('Health check endpoint returns expected schema', async ({ api }) => {
    const response = await api.get(`health`)
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('version')
  })
})
