const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'src', 'app', 'api', 'reports');

function traverse(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('route.ts') && !fullPath.includes('filters')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            if (!content.includes('buildReportFilters')) {
                // Add import
                content = content.replace(
                    'import { prisma } from "@/lib/prisma";',
                    'import { prisma } from "@/lib/prisma";\nimport { buildReportFilters, applyFiltersToLead, applyFiltersToRegistration } from "@/features/reports/server/report-filters";'
                );

                const lines = content.split('\n');
                
                let startIdx = -1;
                let endIdx = -1;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('const ownerAdminId = session.user.ownerAdminId || session.user.id;')) {
                        startIdx = i;
                    }
                    if (startIdx !== -1 && lines[i].includes('if (dateRange !== "all") {')) {
                        // find closing brace of if
                        let braces = 0;
                        for (let j = i; j < lines.length; j++) {
                            if (lines[j].includes('{')) braces++;
                            if (lines[j].includes('}')) braces--;
                            if (braces === 0) {
                                endIdx = j;
                                break;
                            }
                        }
                        break;
                    }
                }
                
                if (startIdx !== -1 && endIdx !== -1) {
                    const replacement = `    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);`;
                    
                    lines.splice(startIdx, endIdx - startIdx + 1, replacement);
                    
                    let newContent = lines.join('\n');
                    
                    // Remove old getters that are unused now
                    newContent = newContent.replace(/.*const dateRange = searchParams\.get\("dateRange"\) \|\| "all";\n/g, '');
                    newContent = newContent.replace(/.*const officeLocationId = searchParams\.get\("officeLocationId"\);\n/g, '');

                    // Replace the where clauses
                    newContent = newContent.replace(/prisma\.lead\.count\(\{\s*where: baseWhere/g, 'prisma.lead.count({ where: leadWhere');
                    newContent = newContent.replace(/prisma\.lead\.findMany\(\{\s*where: baseWhere/g, 'prisma.lead.findMany({ where: leadWhere');
                    newContent = newContent.replace(/prisma\.registration\.count\(\{\s*where: baseWhere/g, 'prisma.registration.count({ where: regWhere');
                    newContent = newContent.replace(/prisma\.registration\.findMany\(\{\s*where: baseWhere/g, 'prisma.registration.findMany({ where: regWhere');
                    newContent = newContent.replace(/prisma\.registration\.findMany\(\{\s*where: \{\s*\.\.\.baseWhere/g, 'prisma.registration.findMany({ where: { ...regWhere');
                    newContent = newContent.replace(/prisma\.leadFollowupHistory\.count\(\{\s*where: \{\s*\.\.\.baseWhere/g, 'prisma.leadFollowupHistory.count({ where: { ...leadWhere');
                    
                    fs.writeFileSync(fullPath, newContent);
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    });
}

traverse(baseDir);
