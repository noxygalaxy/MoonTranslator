use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct ProxyRequestArgs {
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProxyResponse {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn proxy_request(args: ProxyRequestArgs) -> Result<ProxyResponse, String> {
    let client = reqwest::Client::new();

    let mut request_builder = match args.method.to_uppercase().as_str() {
        "GET" => client.get(&args.url),
        "POST" => client.post(&args.url),
        "PUT" => client.put(&args.url),
        "DELETE" => client.delete(&args.url),
        "PATCH" => client.patch(&args.url),
        _ => return Err(format!("Unsupported HTTP method: {}", args.method)),
    };

    if let Some(headers) = args.headers {
        for (key, value) in headers {
            request_builder = request_builder.header(&key, &value);
        }
    }

    if let Some(body) = args.body {
        request_builder = request_builder.body(body);
    }

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Proxy request failed: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok(ProxyResponse { status, body })
}
