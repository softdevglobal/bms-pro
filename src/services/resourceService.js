const API_BASE_URL = '/api';

export const uploadResourceImage = async (resourceId, file, token) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload resource image');
  }

  return await response.json();
};

export const deleteResourceImage = async (resourceId, token) => {
  const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/image`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete resource image');
  }

  return await response.json();
};


