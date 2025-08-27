export async function wait(ms: number): Promise<void> {
  const override = import.meta.env.VITE_TEST_DELAY_MS;
  const duration = override !== undefined ? Number(override) : ms;
  await new Promise(resolve => setTimeout(resolve, duration));
}
