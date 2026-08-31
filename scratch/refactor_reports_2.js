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

                // We want to replace the whole dateRange and baseWhere building block.
                // It usually looks like this:
                // const ownerAdminId = session.user.ownerAdminId || session.user.id;
                // const baseWhere: any = { ownerAdminId };
                // ... date logic ...
                // if (dateRange !== "all") { ... }

                const searchPattern = /const ownerAdminId = session\.user\.ownerAdminId \|\| session\.user\.id;\s+const baseWhere: any = \{ ownerAdminId \};[\s\S]*?(?:if \(dateRange !== "all"\) \{[\s\S]*?\}|baseWhere\.attendanceDate = \{[\s\S]*?\})/g;

                const replacement = `const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);`;

                content = content.replace(searchPattern, replacement);
                
                // Also need to remove the old parameter getters that might be unused now or conflicting.
                content = content.replace(/const dateRange = searchParams\.get\("dateRange"\) \|\| "all";/g, '');
                content = content.replace(/const officeLocationId = searchParams\.get\("officeLocationId"\);/g, '');

                // Now replace the where clauses in Prisma calls
                content = content.replace(/prisma\.lead\.count\(\{\s*where: baseWhere/g, 'prisma.lead.count({ where: leadWhere');
                content = content.replace(/prisma\.lead\.findMany\(\{\s*where: baseWhere/g, 'prisma.lead.findMany({ where: leadWhere');
                content = content.replace(/prisma\.registration\.count\(\{\s*where: baseWhere/g, 'prisma.registration.count({ where: regWhere');
                content = content.replace(/prisma\.registration\.findMany\(\{\s*where: baseWhere/g, 'prisma.registration.findMany({ where: regWhere');
                content = content.replace(/prisma\.registration\.findMany\(\{\s*where: \{\s*\.\.\.baseWhere/g, 'prisma.registration.findMany({ where: { ...regWhere');
                content = content.replace(/prisma\.leadFollowupHistory\.count\(\{\s*where: \{\s*\.\.\.baseWhere/g, 'prisma.leadFollowupHistory.count({ where: { ...leadWhere');
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

traverse(baseDir);
