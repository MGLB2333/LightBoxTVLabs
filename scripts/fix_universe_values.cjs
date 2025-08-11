const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using service role key for admin operations)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://sxbdtrqndejuskuddnl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fixUniverseValues() {
  try {
    console.log('🔧 Fixing universe values in tv_campaign_plans...');
    
    // First, let's see the current values
    const { data: beforeData, error: beforeError } = await supabase
      .from('tv_campaign_plans')
      .select('supplier_name, group_name, universe, network_universe, budget, cpt, plan_tvr, deal_tvr')
      .order('supplier_name, group_name');
    
    if (beforeError) {
      console.error('❌ Error fetching current data:', beforeError);
      return;
    }
    
    console.log('📊 Current universe values:');
    beforeData.forEach(row => {
      console.log(`${row.supplier_name} - ${row.group_name}: universe=${row.universe?.toLocaleString()}, network_universe=${row.network_universe?.toLocaleString()}`);
    });
    
    // Fix universe values that are clearly too large (> 100,000)
    const rowsToFix = beforeData.filter(row => row.universe > 100000);
    
    if (rowsToFix.length === 0) {
      console.log('✅ No universe values need fixing (all are already in correct format)');
      return;
    }
    
    console.log(`🔧 Fixing ${rowsToFix.length} rows with oversized universe values...`);
    
    // Update each row individually to avoid issues
    for (const row of rowsToFix) {
      const newUniverse = Math.round(row.universe / 1000);
      const newNetworkUniverse = row.network_universe ? Math.round(row.network_universe / 1000) : null;
      
      console.log(`Fixing ${row.supplier_name} - ${row.group_name}: ${row.universe?.toLocaleString()} → ${newUniverse?.toLocaleString()}`);
      
      const { error: updateError } = await supabase
        .from('tv_campaign_plans')
        .update({
          universe: newUniverse,
          network_universe: newNetworkUniverse
        })
        .eq('supplier_name', row.supplier_name)
        .eq('group_name', row.group_name);
      
      if (updateError) {
        console.error(`❌ Error updating ${row.supplier_name} - ${row.group_name}:`, updateError);
      }
    }
    
    // Recalculate plan_tvr and deal_tvr with correct universe values
    console.log('🧮 Recalculating plan TVR values with corrected universe...');
    
    const { data: updatedData, error: updatedError } = await supabase
      .from('tv_campaign_plans')
      .select('supplier_name, group_name, universe, budget, cpt, plan_tvr, deal_tvr')
      .order('supplier_name, group_name');
    
    if (updatedError) {
      console.error('❌ Error fetching updated data:', updatedError);
      return;
    }
    
    // Update TVR calculations
    for (const row of updatedData) {
      if (row.budget && row.cpt && row.universe && row.cpt > 0 && row.universe > 0) {
        const calculatedTVR = (row.budget / row.cpt) / (row.universe / 1000);
        
        console.log(`Updating TVR for ${row.supplier_name} - ${row.group_name}: ${calculatedTVR.toFixed(1)}%`);
        
        const { error: tvrError } = await supabase
          .from('tv_campaign_plans')
          .update({
            plan_tvr: Math.round(calculatedTVR * 10) / 10,
            deal_tvr: Math.round(calculatedTVR * 10) / 10
          })
          .eq('supplier_name', row.supplier_name)
          .eq('group_name', row.group_name);
        
        if (tvrError) {
          console.error(`❌ Error updating TVR for ${row.supplier_name} - ${row.group_name}:`, tvrError);
        }
      }
    }
    
    // Show final results
    const { data: finalData, error: finalError } = await supabase
      .from('tv_campaign_plans')
      .select('supplier_name, group_name, universe, network_universe, budget, cpt, plan_tvr, deal_tvr')
      .order('supplier_name, group_name');
    
    if (finalError) {
      console.error('❌ Error fetching final data:', finalError);
      return;
    }
    
    console.log('\n✅ Final universe values and TVRs:');
    finalData.forEach(row => {
      const calculatedTVR = (row.budget && row.cpt && row.universe && row.cpt > 0 && row.universe > 0) 
        ? (row.budget / row.cpt) / (row.universe / 1000) 
        : 0;
      
      console.log(`${row.supplier_name} - ${row.group_name}:`);
      console.log(`  Universe: ${row.universe?.toLocaleString()} (thousands)`);
      console.log(`  Plan TVR: ${row.plan_tvr}% (calculated: ${calculatedTVR.toFixed(1)}%)`);
    });
    
    console.log('\n🎉 Universe values and TVR calculations have been fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing universe values:', error);
  }
}

// Run the fix
fixUniverseValues();
