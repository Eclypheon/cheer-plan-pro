export default async function handler(request, response) {
  // Only allow GET requests
 if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { format, url } = request.query;

  // Validate required parameters
  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required' });
 }

  try {
    // Construct the is.gd API URL
    const isGdUrl = `https://is.gd/create.php?${new URLSearchParams({
      format: format || 'simple',
      url: url
    }).toString()}`;

    // Make the request to is.gd
    const apiResponse = await fetch(isGdUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    });

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({ 
        error: `is.gd API request failed with status: ${apiResponse.status}` 
      });
    }

    // Get the response text
    const responseText = await apiResponse.text();
    
    // Set appropriate headers for the response
    response.setHeader('Content-Type', 'text/plain');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400'); // Cache for 1 hour
    
    // Send the response from is.gd
    response.status(200).send(responseText);
    
  } catch (error) {
    console.error('Error in is.gd proxy:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    responseLimit: '1mb',
  },
};
