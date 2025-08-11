require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAuthAndOrg() {
  try {
    console.log('🔐 Testing authentication and organization membership...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User auth error:', userError);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Check organization membership
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    if (orgError) {
      console.error('❌ Organization membership error:', orgError);
      return;
    }
    
    if (!orgMember) {
      console.log('❌ User not in any organization');
      return;
    }
    
    console.log('✅ User is member of organization:', orgMember.organization_id);
    
    // Check if user can access tv_campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('tv_campaigns')
      .select('*')
      .limit(1);
    
    if (campaignsError) {
      console.error('❌ Cannot access tv_campaigns:', campaignsError);
      return;
    }
    
    console.log('✅ Can access tv_campaigns, found:', campaigns?.length || 0, 'campaigns');
    
    // Check if user can insert into tv_campaign_actuals
    const testActual = {
      campaign_id: '00000000-0000-0000-0000-000000000000', // dummy ID
      supplier_name: 'Test Supplier',
      group_name: 'Test Group',
      date: '2025-01-01',
      actual_tvr: 1.0,
      actual_value: 1000,
      spots_count: 1,
      impacts: 1000
    };
    
    const { error: insertError } = await supabase
      .from('tv_campaign_actuals')
      .insert(testActual);
    
    if (insertError) {
      console.error('❌ Cannot insert into tv_campaign_actuals:', insertError);
      return;
    }
    
    console.log('✅ Can insert into tv_campaign_actuals');
    
    // Clean up test data
    await supabase
      .from('tv_campaign_actuals')
      .delete()
      .eq('supplier_name', 'Test Supplier');
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthAndOrg(); 