/**
 * Test script for newsletter subscription with Resend audience integration
 * This script tests the complete newsletter flow including Resend audience addition
 */

const API_URL = 'http://localhost:4321/api/newsletter-subscribe';
const TEST_EMAIL = 'test-user@example.com';

// Mock reCAPTCHA token for testing
const MOCK_RECAPTCHA_TOKEN = 'test-token-' + Date.now();

async function testNewsletterSubscription() {
    console.log('🧪 Testing Newsletter Subscription with Resend Integration...\n');

    try {
        // Test newsletter subscription
        console.log('📧 Testing newsletter subscription...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                recaptchaToken: MOCK_RECAPTCHA_TOKEN
            })
        });

        const result = await response.json();
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Data:', JSON.stringify(result, null, 2));

        if (response.ok && result.success) {
            console.log('✅ Newsletter subscription successful!');
            
            if (result.addedToAudience) {
                console.log('✅ Contact added to Resend audience!');
            } else if (result.audienceAddError) {
                console.log('⚠️  Contact saved to database but audience addition failed:', result.audienceAddError);
            }
        } else {
            console.log('❌ Newsletter subscription failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Test different scenarios
async function runAllTests() {
    console.log('🎯 Running comprehensive newsletter tests...\n');
    
    // Test 1: Normal subscription
    await testNewsletterSubscription();
    
    console.log('\n⏳ Waiting 2 seconds before next test...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Duplicate subscription (should be prevented)
    console.log('🔄 Testing duplicate subscription prevention...');
    await testNewsletterSubscription();
    
    console.log('\n✨ All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { testNewsletterSubscription, runAllTests };
