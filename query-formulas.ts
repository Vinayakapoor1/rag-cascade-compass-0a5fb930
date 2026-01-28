import { supabase } from './src/integrations/supabase/client';

/**
 * Query all formulas from the database to see what was imported
 */
async function queryAllFormulas() {
    console.log('=== QUERYING ALL FORMULAS FROM DATABASE ===\n');

    // Get FO formulas
    const { data: fos, error: foError } = await supabase
        .from('functional_objectives')
        .select('id, name, formula, department_id')
        .not('formula', 'is', null);

    if (foError) {
        console.error('Error fetching FO formulas:', foError);
    } else {
        console.log(`\n📊 FUNCTIONAL OBJECTIVES (${fos?.length || 0} with formulas):`);
        fos?.forEach(fo => {
            console.log(`  - ${fo.name}`);
            console.log(`    Formula: "${fo.formula}"`);
            console.log('');
        });
    }

    // Get KR formulas
    const { data: krs, error: krError } = await supabase
        .from('key_results')
        .select('id, name, formula, functional_objective_id')
        .not('formula', 'is', null);

    if (krError) {
        console.error('Error fetching KR formulas:', krError);
    } else {
        console.log(`\n🎯 KEY RESULTS (${krs?.length || 0} with formulas):`);
        krs?.forEach(kr => {
            console.log(`  - ${kr.name}`);
            console.log(`    Formula: "${kr.formula}"`);
            console.log('');
        });
    }

    // Get KPI formulas
    const { data: kpis, error: kpiError } = await supabase
        .from('indicators')
        .select('id, name, formula, key_result_id')
        .not('formula', 'is', null);

    if (kpiError) {
        console.error('Error fetching KPI formulas:', kpiError);
    } else {
        console.log(`\n📈 INDICATORS/KPIs (${kpis?.length || 0} with formulas):`);
        kpis?.forEach(kpi => {
            console.log(`  - ${kpi.name}`);
            console.log(`    Formula: "${kpi.formula}"`);
            console.log('');
        });
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total FOs with formulas: ${fos?.length || 0}`);
    console.log(`Total KRs with formulas: ${krs?.length || 0}`);
    console.log(`Total KPIs with formulas: ${kpis?.length || 0}`);

    // Analyze formula types
    const allFormulas = [
        ...(fos?.map(f => f.formula) || []),
        ...(krs?.map(f => f.formula) || []),
        ...(kpis?.map(f => f.formula) || [])
    ];

    const standardFormulas = allFormulas.filter(f =>
        f && ['AVG', 'SUM', 'WEIGHTED_AVG', 'MIN', 'MAX'].includes(f.toUpperCase().trim())
    );

    const customFormulas = allFormulas.filter(f =>
        f && !['AVG', 'SUM', 'WEIGHTED_AVG', 'MIN', 'MAX'].includes(f.toUpperCase().trim())
    );

    console.log(`\nStandard formulas (AVG/SUM/etc): ${standardFormulas.length}`);
    console.log(`Custom/BODMAS formulas: ${customFormulas.length}`);

    if (customFormulas.length > 0) {
        console.log('\n🔍 CUSTOM FORMULAS DETECTED:');
        customFormulas.forEach(f => console.log(`  - "${f}"`));
    }
}

queryAllFormulas().catch(console.error);
