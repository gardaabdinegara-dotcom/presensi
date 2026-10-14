import { GoogleAuth } from 'google-auth-library';
import { configuration, serviceCredentials } from './config.mjs';
import { randomUUID } from 'node:crypto';

export const collections = ['Users','Students','Sessions','Attendance','Tests','Assignments','Submissions','Health','Settings','Reports','Auth','Audit'];
const headers = ['event_id','timestamp_utc','actor_id','entity_id','operation','data_json'];
let authPromise;
let sheetMap;
let lastRead;
let readPromise;
let generation=0;
const cacheMilliseconds = 1200;
function authenticatedClient() {
  authPromise ||= serviceCredentials().then(credentials => new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }).getClient());
  return authPromise;
}
export async function sheetsRequest(route = '', options = {}) {
  const { spreadsheetId } = configuration();
  if (!spreadsheetId) throw new Error('SPREADSHEET_NOT_CONFIGURED');
  const client = await authenticatedClient();
  try {
    const response = await client.request({ url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${route}`, ...options, timeout: 20000, retry: false });
    return response.data;
  } catch (error) {
    const status = Number(error.response?.status || error.status || 0);
    const safe = new Error(status === 403 ? 'SHEETS_ACCESS_DENIED' : status === 429 ? 'SHEETS_RATE_LIMIT' : status === 404 ? 'SPREADSHEET_NOT_FOUND' : 'SHEETS_UNAVAILABLE');
    safe.status = status === 429 ? 503 : 502;
    throw safe;
  }
}
export async function inspectSpreadsheet() {
  const result = await sheetsRequest('?fields=spreadsheetId,properties(title),sheets(properties(sheetId,title,gridProperties))');
  return { title: result.properties.title, tabs: result.sheets.map(item => item.properties) };
}
async function mapSheets() {
  if (!sheetMap) {
    const result = await inspectSpreadsheet();
    sheetMap = new Map(result.tabs.map(tab => [tab.title, tab.sheetId]));
  }
  return sheetMap;
}
export async function initializeSchema() {
  const original = await inspectSpreadsheet();
  sheetMap = new Map(original.tabs.map(tab => [tab.title, tab.sheetId]));
  const missing = collections.filter(name => !sheetMap.has(`GAN_${name}`));
  if (missing.length) {
    const result = await sheetsRequest(':batchUpdate', { method: 'POST', data: { requests: missing.map(name => ({ addSheet: { properties: { title: `GAN_${name}`, gridProperties: { rowCount: 1000, columnCount: 6, frozenRowCount: 1 } } } })) } });
    result.replies.forEach(reply => sheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId));
    await sheetsRequest('/values:batchUpdate', { method: 'POST', data: { valueInputOption: 'RAW', data: missing.map(name => ({ range: `'GAN_${name}'!A1:F1`, values: [headers] })) } });
    await sheetsRequest(':batchUpdate', { method: 'POST', data: { requests: missing.flatMap(name => [
      { repeatCell: { range: { sheetId: sheetMap.get(`GAN_${name}`), startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: .063, green: .153, blue: .196 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: 'userEnteredFormat' } },
      { updateDimensionProperties: { range: { sheetId: sheetMap.get(`GAN_${name}`), dimension: 'COLUMNS', startIndex: 0, endIndex: 5 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
      { updateDimensionProperties: { range: { sheetId: sheetMap.get(`GAN_${name}`), dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 600 }, fields: 'pixelSize' } }
    ]) } });
  }
  invalidateStore();
  return { title: original.title, created: missing.map(name => `GAN_${name}`), preserved: original.tabs.map(tab => tab.title) };
}
export function reduceRows(rows = []) {
  const map = new Map();
  const seen = new Set();
  for (const row of rows) {
    if (!row[0] || !row[3]) continue;
    if (seen.has(row[0])) continue;
    seen.add(row[0]);
    let payload;
    try { payload = JSON.parse(row[5] || '{}'); } catch { throw new Error('INVALID_DATABASE_ROW'); }
    const entityId = String(row[3]);
    if (row[4] === 'DELETE') map.delete(entityId);
    else map.set(entityId, { ...payload, id: entityId, _event: String(row[0]), _at: String(row[1]), _actor: String(row[2]) });
  }
  return map;
}
export async function readStore({ fresh = false } = {}) {
  if (!fresh && lastRead && Date.now() - lastRead.time < cacheMilliseconds) return lastRead.value;
  if (readPromise) return readPromise;
  const readingGeneration=generation;
  const work = (async () => {
    const params = new URLSearchParams();
    for (const name of collections) params.append('ranges', `'GAN_${name}'!A2:F`);
    const result = await sheetsRequest(`/values:batchGet?${params}`);
    const store = Object.fromEntries(collections.map((name, index) => [name, reduceRows(result.valueRanges?.[index]?.values)]));
    if(generation===readingGeneration)lastRead = { time: Date.now(), value: store };
    return store;
  })();
  readPromise = work;
  try { return await work; } finally { if (readPromise===work) readPromise = undefined; }
}
export function invalidateStore() { generation++;lastRead = undefined; readPromise = undefined; }
export async function entityHistory(collection,entityId) {
  if(!collections.includes(collection))throw new Error('INVALID_COLLECTION');
  const result=await sheetsRequest(`/values/${encodeURIComponent(`'GAN_${collection}'!A2:F`)}`);
  return (result.values||[]).filter(row=>row[3]===entityId&&row[4]==='UPSERT').map(row=>({eventId:row[0],at:row[1],...JSON.parse(row[5]||'{}')}));
}
export async function appendEvents(events, { actorId = 'system', operationId = randomUUID() } = {}) {
  const map = await mapSheets();
  const at = new Date().toISOString();
  const requests = events.map((event, index) => {
    if (!collections.includes(event.collection)) throw new Error('INVALID_COLLECTION');
    const json = JSON.stringify(event.value || {});
    if (json.length > 45000) throw new Error('RECORD_TOO_LARGE');
    const values = [`${operationId}:${index}`, at, actorId, String(event.id), event.remove ? 'DELETE' : 'UPSERT', json];
    return { appendCells: { sheetId: map.get(`GAN_${event.collection}`), rows: [{ values: values.map(value => ({ userEnteredValue: { stringValue: value } })) }], fields: 'userEnteredValue' } };
  });
  await sheetsRequest(':batchUpdate', { method: 'POST', data: { requests } });
  invalidateStore();
  return { at, operationId };
}
export function applyEvents(store, events) {
  const next = Object.fromEntries(collections.map(name => [name, new Map(store[name])]));
  for (const event of events) {
    if (event.remove) next[event.collection].delete(String(event.id));
    else next[event.collection].set(String(event.id), { ...event.value, id: String(event.id), _at: new Date().toISOString() });
  }
  return next;
}
