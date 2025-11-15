const v1Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const v2Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[2][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const v3Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[3][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const v4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const v5Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function v1(str: string) {
  return v1Regex.test(str);
}

function v2(str: string) {
  return v2Regex.test(str);
}

function v3(str: string) {
  return v3Regex.test(str);
}

function v4(str: string) {
  return v4Regex.test(str);
}

function v5(str: string) {
  return v5Regex.test(str);
}

export function isUUID(str: string) {
  return v4(str) || v1(str) || v2(str) || v3(str) || v5(str);
}
