import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkDuplicates() {
    console.log('🔍 Checking for duplicate customers...\n');

    // Get all customers
    const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

    if (customersError) {
        console.error('Error fetching customers:', customersError);
        return;
    }

    // Group by name
    const nameMap = new Map<string, string[]>();
    customers?.forEach(c => {
        const existing = nameMap.get(c.name) || [];
        existing.push(c.id);
        nameMap.set(c.name, existing);
    });

    // Find duplicates
    const duplicates = Array.from(nameMap.entries())
        .filter(([_, ids]) => ids.length > 1)
        .map(([name, ids]) => ({ name, count: ids.length, ids }));

    if (duplicates.length > 0) {
        console.log(`❌ Found ${duplicates.length} duplicate customer names:\n`);
        duplicates.forEach(dup => {
            console.log(`  "${dup.name}" - ${dup.count} records`);
            dup.ids.forEach(id => console.log(`    - ${id}`));
            console.log();
        });
    } else {
        console.log('✅ No exact duplicate customer names found\n');
    }

    // Check for similar names
    console.log('🔍 Checking for similar customer names...\n');
    const allNames = Array.from(nameMap.keys()).sort();
    const similar: Array<[string, string]> = [];

    for (let i = 0; i < allNames.length; i++) {
        for (let j = i + 1; j < allNames.length; j++) {
            const n1 = allNames[i].toLowerCase();
            const n2 = allNames[j].toLowerCase();

            // Check if one contains the other
            if (n1.includes(n2) || n2.includes(n1)) {
                similar.push([allNames[i], allNames[j]]);
            }
        }
    }

    if (similar.length > 0) {
        console.log(`⚠️  Found ${similar.length} pairs of similar names:\n`);
        similar.forEach(([name1, name2]) => {
            console.log(`  "${name1}" ↔️ "${name2}"`);
        });
        console.log();
    }

    // Check features
    console.log('\n🔍 Checking for duplicate features...\n');

    const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('id, name')
        .order('name');

    if (featuresError) {
        console.error('Error fetching features:', featuresError);
        return;
    }

    const featureNameMap = new Map<string, string[]>();
    features?.forEach(f => {
        const existing = featureNameMap.get(f.name) || [];
        existing.push(f.id);
        featureNameMap.set(f.name, existing);
    });

    const featureDuplicates = Array.from(featureNameMap.entries())
        .filter(([_, ids]) => ids.length > 1)
        .map(([name, ids]) => ({ name, count: ids.length, ids }));

    if (featureDuplicates.length > 0) {
        console.log(`❌ Found ${featureDuplicates.length} duplicate feature names:\n`);
        featureDuplicates.forEach(dup => {
            console.log(`  "${dup.name}" - ${dup.count} records`);
            dup.ids.forEach(id => console.log(`    - ${id}`));
            console.log();
        });
    } else {
        console.log('✅ No duplicate feature names found\n');
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total customers: ${customers?.length || 0}`);
    console.log(`  Duplicate customer names: ${duplicates.length}`);
    console.log(`  Similar customer names: ${similar.length} pairs`);
    console.log(`  Total features: ${features?.length || 0}`);
    console.log(`  Duplicate feature names: ${featureDuplicates.length}`);
}

checkDuplicates().catch(console.error);
