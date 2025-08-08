// Simple test script to verify the view tracking API
async function testViewTracking() {
  try {
    const response = await fetch('http://localhost:4321/api/increment-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({ slug: 'test-post' })
    });

    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Run the test
testViewTracking();
