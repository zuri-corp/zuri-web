import {createZuriToolClient} from '../index.mjs';
// This runs on your trusted server. Never send these environment values to a client.
const zuri=createZuriToolClient({baseUrl:process.env.ZURI_ORIGIN,toolKey:process.env.ZURI_TOOL_KEY,installationToken:process.env.ZURI_INSTALLATION_TOKEN});
console.log(await zuri.space.get());
console.log(await zuri.bookings.list());
// On an authenticated customer submission, call zuri.bookings.create(payload,
// {idempotencyKey: yourPersistedRequestId}). The initial status is requested,
// not confirmed. Only call update after the authorized Space team decides.
