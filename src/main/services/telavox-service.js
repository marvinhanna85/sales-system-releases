function buildAuthHeaders(token) {
  if (!token?.trim()) {
    throw new Error("Telavox-token saknas.");
  }

  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/json"
  };
}

async function parseError(response) {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const payload = JSON.parse(text);
    return payload.message || text;
  } catch {
    return text;
  }
}

async function fetchTelavoxCalls({ token, fromDate, toDate, withRecordings = true }) {
  const endpoint = new URL("https://api.telavox.se/calls");
  if (fromDate) {
    endpoint.searchParams.set("fromDate", fromDate);
  }
  if (toDate) {
    endpoint.searchParams.set("toDate", toDate);
  }
  endpoint.searchParams.set("withRecordings", String(Boolean(withRecordings)));

  const response = await fetch(endpoint, {
    method: "GET",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`Telavox-samtal kunde inte hämtas: ${await parseError(response)}`);
  }

  const payload = await response.json();
  return [
    ...flattenCalls(payload.incoming, "incoming"),
    ...flattenCalls(payload.outgoing, "outgoing"),
    ...flattenCalls(payload.missed, "missed")
  ].sort((left, right) => new Date(right.happenedAt) - new Date(left.happenedAt));
}

async function fetchTelavoxRecording({ token, recordingId }) {
  if (!recordingId) {
    throw new Error("Inget recordingId finns för samtalet.");
  }

  const endpoint = `https://api.telavox.se/recordings/${encodeURIComponent(recordingId)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "audio/mpeg"
    }
  });

  if (!response.ok) {
    throw new Error(`Telavox-inspelning kunde inte hämtas: ${await parseError(response)}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    bytes,
    fileName: `telavox-${recordingId}.mp3`
  };
}

function flattenCalls(items, direction) {
  return Array.isArray(items)
    ? items.map((item) => ({
        direction,
        remoteNumber: item.number || "",
        happenedAt: item.datetimeISO || item.datetime || "",
        durationSeconds: Number(item.duration) || 0,
        recordingId: item.recordingId && item.recordingId !== "0" ? item.recordingId : ""
      }))
    : [];
}

module.exports = {
  fetchTelavoxCalls,
  fetchTelavoxRecording
};
