
// MiniMax Video Generation API Service
// Docs: https://platform.minimaxi.com/docs/api-reference/video-generation-t2v

const BASE_URL = localStorage.getItem('minimax_base_url') || 'https://api.minimaxi.com/v1';
const API_KEY_KEY = 'minimax_api_key';

export interface GenerateParams {
  prompt: string;
  model?: string;
}

export interface TaskStatus {
  status: 'Queueing' | 'Processing' | 'Success' | 'Fail';
  file_id?: string;
  download_url?: string;
  error?: string;
}

export function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || '';
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_KEY, key);
}

export async function generateVideo(params: GenerateParams): Promise<{ task_id: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先设置 MiniMax API Key');
  }

  // 1. Create Task: POST /v1/video_generation
  const url = `${BASE_URL}/video_generation`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: params.model || 'MiniMax-Hailuo-2.3',
      prompt: params.prompt
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.base_resp?.status_msg || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(data.base_resp.status_msg || 'Unknown error');
  }

  return { task_id: data.task_id };
}

export async function queryTaskStatus(taskId: string): Promise<TaskStatus> {
  const apiKey = getApiKey();
  
  // 2. Query Task: GET /v1/query/video_generation?task_id={task_id}
  // Note: Official docs might be slightly confusing, but standard practice for MiniMax 
  // asynchronous tasks is often /query/video_generation or /video_generation/task
  // However, based on user feedback (404 on /video_generation), and common API patterns:
  const url = `${BASE_URL}/query/video_generation?task_id=${taskId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
     throw new Error(`Status check failed: ${response.status}`);
  }

  const data = await response.json();
  
  let status: TaskStatus['status'] = 'Processing';
  
  // API returns lowercase status usually
  const apiStatus = (data.status || '').toLowerCase();
  if (apiStatus === 'success') status = 'Success';
  else if (apiStatus === 'failed' || apiStatus === 'fail') status = 'Fail';
  else if (apiStatus === 'queueing') status = 'Queueing';
  else status = 'Processing';

  if (status === 'Success') {
      let downloadUrl = '';
      if (data.file_id) {
          try {
            downloadUrl = await fetchFileDownloadUrl(data.file_id);
          } catch (e) {
            console.warn('Failed to fetch download url', e);
          }
      }

      return {
          status: 'Success',
          file_id: data.file_id,
          download_url: downloadUrl
      };
  }

  return {
      status,
      error: data.base_resp?.status_msg
  };
}

export async function fetchFileDownloadUrl(fileId: string): Promise<string> {
   const apiKey = getApiKey();
   // 3. Retrieve File: GET /v1/files/retrieve?file_id={file_id}
   const url = `${BASE_URL}/files/retrieve?file_id=${fileId}`;
   
   const response = await fetch(url, {
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${apiKey}`
     }
   });

   if (!response.ok) {
      throw new Error('Failed to retrieve file info');
   }
   
   const data = await response.json();
   
   // Expected response: { file: { download_url: "..." } }
   if (data.file && data.file.download_url) {
       return data.file.download_url;
   }
   
   return ''; 
}
