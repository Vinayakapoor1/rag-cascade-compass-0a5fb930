import { supabase } from '@/integrations/supabase/client';

const PROTECTED_DEPARTMENTS = ['Customer Success', 'Content Management'];

interface KPIDef {
  name: string;
  formula: string;
}

interface KRDef {
  name: string;
  formula: string;
  kpis: KPIDef[];
}

interface FODef {
  name: string;
  formula: string;
  keyResults: KRDef[];
}

interface DepartmentDef {
  departmentName: string;
  orgObjectiveName: string; // existing org objective name OR new one
  isNew: boolean; // whether org objective + department need to be created
  newOrgColor?: string;
  functionalObjectives: FODef[];
}

const DEPARTMENTS: DepartmentDef[] = [
  // Sheet 1: Product Management
  {
    departmentName: 'Product Management',
    orgObjectiveName: 'Drive Product Adoption and Retention',
    isNew: false,
    functionalObjectives: [
      {
        name: 'Define and deliver a world-class cybersecurity product strategy aligned to customer risk priorities and market opportunity',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Achieve validated PMF for top high-value use cases with customer demand and competitive win evidence', formula: 'KPI %', kpis: [
            { name: 'PMF Validation Rate', formula: 'Validated high-value use cases / Total target use cases × 100' },
          ]},
          { name: 'Deliver roadmap with ≥85% alignment to customer risk priorities', formula: '(KPI1 % + KPI2 %) / 2', kpis: [
            { name: 'Priority Alignment Score', formula: 'Roadmap items aligned to top customer security priorities / Total roadmap items × 100' },
            { name: 'Roadmap Responsiveness Rate', formula: 'New customer-identified security risks incorporated into roadmap within 30 days / Total new security risks identified × 100' },
          ]},
          { name: 'Achieve 100% product roadmap coverage for planned technology partner integrations each with validated security and adoption criteria', formula: 'MINIMUM(KPI1 %, KPI2 %)', kpis: [
            { name: 'Partner Integration Roadmap Coverage', formula: 'Partner integrations approved in product roadmap / Total planned partner integrations × 100' },
            { name: 'Partner Criteria Validation Rate', formula: 'Partner integrations with security and adoption criteria formally validated and signed off / Total approved partner integrations × 100' },
          ]},
          { name: 'Achieve ≥85% delivery predictability on committed roadmap items', formula: 'KPI %', kpis: [
            { name: 'Delivery Predictability Rate', formula: 'Roadmap items delivered on time & in-scope / Roadmap items committed for the period × 100' },
          ]},
        ],
      },
      {
        name: 'Ensure product releases deliver measurable customer value with high adoption and low friction',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Achieve ≥80% feature adoption for all new major releases', formula: '(Current Feature Adoption Rate / 80 × 100 + Adoption-Driven Retention Lift / 10 × 100) / 2', kpis: [
            { name: 'Feature Adoption Rate', formula: 'Users actively using the feature / Total eligible users × 100' },
            { name: 'Adoption-Driven Retention Lift', formula: '(Retention rate of product feature adopters − Non-adopters) / Non-adopters × 100' },
          ]},
          { name: 'Reduce UX friction and recurring support drivers by 80% within 6 months', formula: 'MINIMUM(Current UX Friction Reduction % / 80 × 100, Current Recurring Issue Reduction % / 80 × 100)', kpis: [
            { name: 'UX Friction Reduction Rate', formula: '(UX Friction Rate: Previous release − Current release) / Previous release × 100' },
            { name: 'Recurring Issue Reduction Rate', formula: '(Recurring issues: Previous period − Current period) / Previous period × 100' },
          ]},
        ],
      },
    ],
  },

  // Sheet 2: Product Engineering
  {
    departmentName: 'Product Engineering',
    orgObjectiveName: 'Enhance Product Quality: Reliability, Security & Performance',
    isNew: false,
    functionalObjectives: [
      {
        name: 'Build the product right with adequate security, scalability, reliability, agility and delivery speed',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Deliver ≥85% of planned releases on or before committed dates', formula: 'Current On-Time Release Rate / 85 × 100', kpis: [
            { name: 'On-Time Release Rate', formula: 'Releases delivered on or before committed date / Total planned releases × 100' },
          ]},
          { name: 'Achieve zero Critical or High Severity defects across all product releases', formula: 'Current Critical/High Defect-Free Release Rate / 100 × 100', kpis: [
            { name: 'Critical/High Defect-Free Release Rate', formula: 'Releases with zero Critical or High severity defects (functional + cybersecurity) / Total releases × 100' },
          ]},
          { name: 'Achieve 85% automated test coverage across critical user journeys and security functions', formula: 'Current Automated Test Coverage % / 85 × 100', kpis: [
            { name: 'Automated Test Coverage Rate', formula: 'Automated test cases covering critical user journeys & security functions / Total critical user journeys & security functions × 100' },
          ]},
          { name: 'Remediate 100% of Critical/High security vulnerabilities identified through SAST/DAST before each release', formula: 'Current Security Vulnerability Remediation Rate / 100 × 100', kpis: [
            { name: 'Security Vulnerability Remediation Rate', formula: 'Critical/High vulnerabilities remediated before release / Total Critical/High vulnerabilities identified × 100' },
          ]},
        ],
      },
      {
        name: 'Enable customer value realization through scalable product platform capabilities and ecosystem integration',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Address 90% of customer queries through a self-service portal', formula: '(Current Self-Service Resolution Rate / 90 × 100 + Current Portal Adoption Rate / 100 × 100) / 2', kpis: [
            { name: 'Self-Service Resolution Rate', formula: 'Customer queries resolved via self-service / Total customer queries × 100' },
            { name: 'Portal Adoption Rate', formula: 'Customers actively using the portal / Total onboarded customers × 100' },
          ]},
          { name: 'Embed reporting and dashboarding capability across 100% of product features', formula: '(Current Reporting & Dashboard Coverage Rate / 100 × 100 + Current Dashboard Active Usage Rate / 100 × 100) / 2', kpis: [
            { name: 'Reporting & Dashboard Coverage Rate', formula: 'Product features with live reporting & dashboarding / Total production features × 100' },
            { name: 'Dashboard Active Usage Rate', formula: 'Customers actively using dashboards / Total customers with access × 100' },
          ]},
          { name: 'Achieve live integration with technology partner ecosystem across all planned integrations', formula: 'Current Partner Integration Coverage Rate / 100 × 100', kpis: [
            { name: 'Partner Integration Coverage Rate', formula: 'Technology partner integrations live in product / Total planned partner integrations × 100' },
          ]},
          { name: 'Resolve 100% of PM-identified UX friction items within the same or next release cycle', formula: 'Current UX Friction Item Resolution Rate / 100 × 100', kpis: [
            { name: 'UX Friction Item Resolution Rate', formula: 'PM-identified UX friction items resolved within agreed release cycle / Total PM-identified UX friction items × 100' },
          ]},
        ],
      },
    ],
  },

  // Sheet 3: Quality Assurance
  {
    departmentName: 'Quality Assurance',
    orgObjectiveName: 'Enhance Product Quality: Reliability, Security & Performance',
    isNew: false,
    functionalObjectives: [
      {
        name: 'Build proactive quality culture by embedding QA early in the development lifecycle',
        formula: 'MINIMUM(KR1 %, KR2 %)',
        keyResults: [
          { name: 'Conduct 100% test planning at feature design stage (Shift-Left)', formula: 'MINIMUM(KPI1 %, KPI2 %)', kpis: [
            { name: 'Design-Stage Test Planning Coverage', formula: 'Features with test plans approved at design stage / Total features entering development × 100' },
            { name: 'On-Time Test Planning Success Rate', formula: 'Features with test plans approved before development start / Total features entering development × 100' },
          ]},
          { name: 'Achieve 100% test case requirement coverage (traceability)', formula: 'MINIMUM(KPI1 %, KPI2 %)', kpis: [
            { name: 'Requirement-to-Test Mapping', formula: 'Requirements mapped to ≥1 test case / Total approved requirements × 100' },
            { name: 'Requirement-Level Test Execution Coverage', formula: 'Requirements whose mapped test cases were executed in the release / Total approved requirements × 100' },
          ]},
        ],
      },
      {
        name: 'Deliver a highly reliable and secure product with zero critical failures in customer environments',
        formula: 'MINIMUM(KR1 %, KR2 %)',
        keyResults: [
          { name: 'Maintain 100% coverage of functionality and security test cases for all high-impact features', formula: 'MINIMUM(KPI1 %, KPI2 %)', kpis: [
            { name: 'High-Impact Feature Test Coverage', formula: 'High impact features with ≥1 functional test case / Total high impact features × 100' },
            { name: 'High-Impact Feature Security Risk Coverage', formula: 'High impact security risks with ≥1 security test / Total identified high impact risks × 100' },
          ]},
          { name: 'Ensure 100% SLA compliance for defect resolution on customer-reported issues', formula: 'MINIMUM(KPI1 %, KPI2 %)', kpis: [
            { name: 'SLA Compliance Rate', formula: 'Customer defects resolved within SLA / Total customer reported defects × 100' },
            { name: 'Critical Defect SLA Compliance Rate', formula: 'Critical customer-reported defects resolved within SLA / Total critical customer-reported defects × 100' },
          ]},
        ],
      },
      {
        name: 'Increase QA efficiency and reduce manual dependencies through automation and tooling',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Ensure 100% of CI/CD builds execute all required automated test and security scan gates', formula: 'KPI %', kpis: [
            { name: 'CI/CD Automation Gate Coverage', formula: 'Builds with all required automated test and security gates executed / Total builds generated × 100' },
          ]},
          { name: 'Achieve 100% UX regression test coverage for all releases to validate resolution of PM-identified friction items', formula: 'KPI %', kpis: [
            { name: 'UX Regression Test Coverage Rate', formula: 'Releases with completed UX regression test coverage for PM-identified friction items / Total releases × 100' },
          ]},
        ],
      },
    ],
  },

  // Sheet 4: Sales
  {
    departmentName: 'Sales',
    orgObjectiveName: 'Expand Pipeline and Revenue Growth',
    isNew: false,
    functionalObjectives: [
      {
        name: 'Deliver accurate and predictable revenue forecasting to support 3X growth planning',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Achieve ≥90% revenue forecast accuracy against actual closed ARR each quarter', formula: 'Current Revenue Forecast Accuracy / 90 × 100', kpis: [
            { name: 'Revenue Forecast Accuracy Rate', formula: '(1 − |Forecast ARR − Actual Closed ARR| / Forecast ARR) × 100 per quarter' },
          ]},
          { name: 'Maintain a qualified pipeline of at least 3x the quarterly ARR target at all times', formula: 'Current Pipeline Coverage Ratio / 3 × 100', kpis: [
            { name: 'Pipeline Coverage Ratio', formula: 'Total qualified pipeline value / Quarterly ARR target — target ≥3x' },
          ]},
          { name: 'Achieve ≥70% of committed forecast deals closing within the committed quarter', formula: 'Current Forecast-to-Close Rate / 70 × 100', kpis: [
            { name: 'Forecast-to-Close Conversion Rate', formula: 'Deals committed in forecast that closed within committed quarter / Total deals committed in forecast × 100' },
          ]},
        ],
      },
      {
        name: 'Build and convert a high-quality sales pipeline',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Achieve 25% increase in net new ARR', formula: 'Current Net ARR Growth % / 25 × 100', kpis: [
            { name: 'Net New ARR Growth Rate', formula: '(Net New ARR − Churned ARR) / Starting ARR × 100' },
          ]},
          { name: 'Achieve 15% growth in new customer logos from previous year', formula: 'Current New Customer Growth % / 15 × 100', kpis: [
            { name: 'New Customer Logo Growth Rate', formula: '(New logos this period − New logos last period) / New logos last period × 100' },
          ]},
          { name: 'Close 10 net new enterprise deals within 2026', formula: 'Enterprise deals closed / 10 × 100', kpis: [
            { name: 'Enterprise Deal Closure Rate', formula: 'Net new enterprise deals closed / 10 × 100' },
          ]},
          { name: 'Improve win rate against competitors by 15% from baseline', formula: 'Current Win Rate Improvement % / 15 × 100', kpis: [
            { name: 'Competitive Win Rate Improvement', formula: '(Current win rate − Baseline win rate) / Baseline win rate × 100' },
          ]},
        ],
      },
      {
        name: 'Grow revenue from existing customers and strategic partners',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Achieve upsell in 25% of renewal accounts', formula: 'Current Renewal Upsell Rate / 25 × 100', kpis: [
            { name: 'Renewal Upsell Rate', formula: 'Renewal accounts with upsell / Total renewal accounts × 100' },
          ]},
          { name: 'Achieve cross-sell in 20% of eligible accounts', formula: 'Current Cross-sell Coverage Rate / 20 × 100', kpis: [
            { name: 'Cross-sell Coverage Rate', formula: 'Accounts with cross-sell / Total eligible accounts × 100' },
          ]},
          { name: 'Grow partner-sourced ARR by 50% from baseline', formula: 'Current Partner-sourced ARR Growth % / 50 × 100', kpis: [
            { name: 'Partner-sourced ARR Growth Rate', formula: '(Current partner-sourced ARR − Baseline partner-sourced ARR) / Baseline partner-sourced ARR × 100' },
          ]},
        ],
      },
    ],
  },

  // Sheet 5: Security & Technology
  {
    departmentName: 'Security & Technology',
    orgObjectiveName: 'Achieve Operational Excellence - People, Process, Technology',
    isNew: false,
    functionalObjectives: [
      {
        name: 'Enhance Partner Technical Enablement',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Ensure ≥75% of partners achieve pre-sales technical readiness to position and defend secure solutions', formula: 'MIN((Actual Partner Pre-Sales Readiness % / 75) × 100, 100)', kpis: [
            { name: 'Partner Pre-Sales Readiness Compliance %', formula: '(No. of partner-led pre-sales engagements meeting readiness criteria / Total evaluated engagements) × 100' },
          ]},
          { name: 'Ensure ≥90% of partner-led solution designs comply with approved security and architecture standards', formula: 'MIN((Actual Partner Design Compliance % / 90) × 100, 100)', kpis: [
            { name: 'Partner Solution Design Compliance %', formula: '(No. of partner solution designs approved without security deviations / Total designs reviewed) × 100' },
          ]},
        ],
      },
      {
        name: 'Ensure On-Time and Quality Technical Delivery',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Deliver ≥90% of customer implementations on or before committed schedule', formula: 'MIN((Actual On-Time Delivery % / 90) × 100, 100)', kpis: [
            { name: 'On-Time Delivery Rate %', formula: '(No. of deliveries on or before committed schedule / Total deliveries) × 100' },
          ]},
          { name: 'Achieve 100% post-go-live stability with zero Sev-1 or Sev-2 incidents within 30 days of delivery', formula: 'MIN((Actual Post-Go-Live Stability % / 100) × 100, 100)', kpis: [
            { name: 'Post-Go-Live Stability Rate %', formula: '(No. of deliveries with zero Sev-1/Sev-2 incidents within 30 days / Total deliveries) × 100' },
          ]},
        ],
      },
      {
        name: 'Sustain and Scale a Reliable, Resilient Technology Environment',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Maintain 99.9% availability across all customer-impacting platforms as demand scales', formula: 'MIN((Actual Platform Availability % / 99.9) × 100, 100)', kpis: [
            { name: 'Platform Availability %', formula: 'MIN(individual platform availability %) across all customer-impacting platforms' },
          ]},
          { name: 'Sustain ≥90% compliance with defined RTO, RPO, and capacity thresholds across all platforms', formula: 'MIN((Actual Resilience Compliance % / 90) × 100, 100)', kpis: [
            { name: 'Resilience & Capacity Compliance %', formula: '(No. of platforms meeting RTO, RPO, and capacity thresholds / Total in-scope platforms) × 100' },
          ]},
        ],
      },
      {
        name: 'Fortify Security of Managed IT Environment',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Ensure ≥90% of in-scope assets enforce mandated preventive security controls across infrastructure, application, identity, and data layers', formula: 'MIN((Actual Preventive Control Coverage % / 90) × 100, 100)', kpis: [
            { name: 'Preventive Security Control Coverage %', formula: '(No. of in-scope assets with mandated preventive controls / Total in-scope assets) × 100' },
          ]},
          { name: 'Ensure ≥90% of security incidents are detected and contained within defined SLA thresholds', formula: 'MIN((Actual Security Incident SLA Compliance % / 90) × 100, 100)', kpis: [
            { name: 'Security Incident SLA Compliance %', formula: '(No. of security incidents detected & contained within SLA / Total security incidents) × 100' },
          ]},
        ],
      },
      {
        name: 'Drive Automation and Continuous Optimization in Technical Operations',
        formula: '(KR1 % + KR2 %) / 2',
        keyResults: [
          { name: 'Achieve ≥75% automation coverage of identified repetitive operational tasks across operational, security, and compliance activities', formula: 'MIN((Actual Automation Coverage % / 75) × 100, 100)', kpis: [
            { name: 'Operational Automation Coverage %', formula: '(No. of automated repetitive operational tasks / Total identified repetitive operational tasks) × 100' },
          ]},
          { name: 'Achieve ≥25% improvement in each of: incident recurrence rate, change success rate, and service restoration time', formula: 'MIN(Incident Recurrence Improvement % / 25 × 100, Change Success Rate Improvement % / 25 × 100, Service Restoration Improvement % / 25 × 100, 100)', kpis: [
            { name: 'Operational Outcome Improvement %', formula: 'MINIMUM of: [(Baseline incident recurrence − Current) / Baseline × 100], [(Current change success rate − Baseline) / Baseline × 100], [(Baseline restoration time − Current) / Baseline × 100]' },
          ]},
        ],
      },
    ],
  },

  // Sheet 6: HR / People (NEW)
  {
    departmentName: 'HR / People',
    orgObjectiveName: 'Build and Sustain Talent for 3X Growth',
    isNew: true,
    newOrgColor: 'teal',
    functionalObjectives: [
      {
        name: 'Build and sustain the talent capacity needed to achieve 3X growth',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Ensure 100% of approved open roles have at least one qualified candidate in active pipeline', formula: 'Current Pipeline Coverage Rate / 100 × 100', kpis: [
            { name: 'Role Pipeline Coverage Rate', formula: 'Approved open roles with ≥1 qualified candidate in active pipeline / Total approved open roles × 100' },
          ]},
          { name: 'Reduce average time-to-fill for non-executive roles by 20% from baseline', formula: '(Baseline Time-to-Fill − Current Time-to-Fill) / Baseline Time-to-Fill × 100 — target ≥20%', kpis: [
            { name: 'Time-to-Fill Reduction Rate', formula: '(Baseline average time-to-fill − Current average time-to-fill) / Baseline average time-to-fill × 100' },
          ]},
          { name: 'Achieve ≥80% of new hires rated as role-ready within 90 days of joining, assessed against a defined role readiness rubric', formula: 'Current Role-Readiness Rate / 80 × 100', kpis: [
            { name: 'New Hire Role-Readiness Rate', formula: 'New hires rated ≥3/4 on defined role readiness rubric by line manager within 90 days / Total new hires assessed × 100' },
          ]},
          { name: 'Ensure ≥90% of roles required for the next growth milestone are defined, approved, and org-placed at least 30 days before headcount ramp begins', formula: 'Current Growth Role Readiness Rate / 90 × 100', kpis: [
            { name: 'Growth Role Readiness Rate', formula: 'Growth milestone roles fully defined, approved, and org-placed 30+ days before ramp / Total growth milestone roles planned × 100' },
          ]},
        ],
      },
      {
        name: 'Foster a high-engagement culture through people-first practices',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Achieve ≥85% retention of employees in business-critical roles', formula: 'Current Critical Role Retention Rate / 85 × 100', kpis: [
            { name: 'Critical Role Retention Rate', formula: 'Employees in business-critical roles retained at end of period / Employees in business-critical roles at start of period × 100' },
          ]},
          { name: 'Achieve ≥75% employee engagement score in twice-yearly surveys, with documented action plans completed for all identified gaps before the next survey cycle', formula: 'Current Engagement Score / 75 × 100', kpis: [
            { name: 'Employee Engagement Score', formula: 'Average engagement score from standardised twice-yearly survey / Maximum possible score × 100' },
          ]},
          { name: 'Ensure 100% of employees complete an annual performance review with documented outcomes and development commitments', formula: 'Current Performance Review Completion Rate / 100 × 100', kpis: [
            { name: 'Performance Review Completion Rate', formula: 'Employees with completed annual performance review and documented outcomes / Total employees × 100' },
          ]},
        ],
      },
      {
        name: 'Equip every role with the skills needed to deliver its business outcome',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Ensure 100% of roles have a validated Role-Skill-Outcome map by end of H1 2026', formula: 'Current RSO Mapping Completion Rate / 100 × 100', kpis: [
            { name: 'RSO Map Coverage Rate', formula: 'Roles with completed and validated RSO maps / Total roles in org × 100' },
          ]},
          { name: 'Ensure 100% of roles have documented and prioritised skill gaps within 4 weeks of RSO map completion', formula: 'Current Skill Gap Documentation Rate / 100 × 100', kpis: [
            { name: 'Skill Gap Documentation Rate', formula: 'Roles with documented and prioritised skill gaps / Total roles with completed RSO maps × 100' },
          ]},
          { name: 'Achieve ≥80% of roles with critical skill gaps rated ≥3/4 on a defined skill proficiency scale within 6 months of gap identification', formula: 'Current Skill Gap Closure Rate / 80 × 100', kpis: [
            { name: 'Critical Skill Gap Closure Rate', formula: 'Roles with critical gaps rated ≥3/4 on defined skill proficiency scale by line manager within 6 months / Total roles with identified critical gaps × 100' },
          ]},
        ],
      },
    ],
  },

  // Sheet 7: Finance (NEW)
  {
    departmentName: 'Finance',
    orgObjectiveName: 'Achieve Financial Excellence and Runway',
    isNew: true,
    newOrgColor: 'orange',
    functionalObjectives: [
      {
        name: 'Achieve targeted revenue growth and protect profitability',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Achieve ≥90% revenue forecast accuracy against actual closed ARR each quarter', formula: 'Current Revenue Forecast Accuracy / 90 × 100', kpis: [
            { name: 'Revenue Forecast Accuracy Rate', formula: '(1 − |Forecast ARR − Actual ARR| / Forecast ARR) × 100 per quarter' },
          ]},
          { name: 'Maintain gross margin above 70%', formula: 'Current Gross Margin % / 70 × 100', kpis: [
            { name: 'Gross Margin %', formula: '(Revenue − Cost of Goods Sold) / Revenue × 100' },
          ]},
          { name: 'Maintain operating expense ratio below 80% of revenue', formula: 'MIN(Target OpEx Ratio (80) / Current OpEx Ratio × 100, 100)', kpis: [
            { name: 'Operating Expense Ratio', formula: 'Total Operating Expenses / Total Revenue × 100 — target ≤80%' },
          ]},
          { name: 'Complete monthly financial close and reporting within 5 business days of period end', formula: 'Target Close Days (5) / Current Average Close Days × 100', kpis: [
            { name: 'Financial Close Cycle Time', formula: 'Average business days from period end to published financials per month' },
          ]},
        ],
      },
      {
        name: 'Govern spend allocation to maximise business return',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Ensure 100% of approved budget items are mapped to a defined business outcome before funds are released', formula: 'Current Budget-to-Outcome Mapping Rate / 100 × 100', kpis: [
            { name: 'Budget-to-Outcome Mapping Rate', formula: 'Approved budget items with documented business outcome / Total approved budget items × 100' },
          ]},
          { name: 'Achieve ≥80% of budget items delivering confirmed benefit within the committed timeframe', formula: 'Current Benefit Realisation Rate / 80 × 100', kpis: [
            { name: 'Benefit Realisation Rate', formula: 'Budget items with confirmed benefit delivered within committed timeframe / Total budget items reviewed × 100' },
          ]},
          { name: 'Reduce infrastructure and operational costs by 15% from baseline, with zero security incidents or service degradation events attributable to cost reduction actions', formula: '(Baseline Cost − Current Cost) / Baseline Cost × 100 — target ≥15%', kpis: [
            { name: 'Infrastructure and Operational Cost Reduction Rate', formula: '(Baseline infrastructure and operational costs − Current costs) / Baseline costs × 100' },
          ]},
        ],
      },
      {
        name: 'Maintain financial stability and runway for 3X growth',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Maintain minimum 12 months cash runway at all times throughout 2026', formula: 'Current Cash Runway (months) / 12 × 100', kpis: [
            { name: 'Cash Runway (months)', formula: 'Current cash and liquid reserves / Average monthly cash burn rate' },
          ]},
          { name: 'Maintain monthly cash burn rate within 10% variance of planned burn rate', formula: 'MIN(Target Variance (10) / Current Burn Rate Variance % × 100, 100)', kpis: [
            { name: 'Burn Rate Variance', formula: '|Actual monthly burn rate − Planned monthly burn rate| / Planned monthly burn rate × 100 — target ≤10%' },
          ]},
          { name: 'Achieve ≥85% cash flow forecast accuracy against actuals on a rolling 90-day basis', formula: 'Current Cash Flow Forecast Accuracy / 85 × 100', kpis: [
            { name: 'Cash Flow Forecast Accuracy', formula: '(1 − |Forecast cash flow − Actual cash flow| / |Forecast cash flow|) × 100 — rolling 90-day basis' },
          ]},
        ],
      },
    ],
  },

  // Sheet 8: Marketing (NEW)
  {
    departmentName: 'Marketing',
    orgObjectiveName: 'Drive Market Penetration and Demand Generation',
    isNew: true,
    newOrgColor: 'yellow',
    functionalObjectives: [
      {
        name: 'Drive market penetration across priority cybersecurity segments',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Achieve ≥40% of qualified marketing pipeline sourced from priority segments (BFSI, Healthcare, Technology)', formula: 'Current Priority Segment Pipeline % / 40 × 100', kpis: [
            { name: 'Priority Segment Pipeline Coverage Rate', formula: 'Qualified pipeline value from BFSI, Healthcare, and Technology segments / Total qualified pipeline value × 100' },
          ]},
          { name: 'Achieve ≥25% of net new MQLs sourced from accounts matching the defined Ideal Customer Profile', formula: 'Current ICP MQL Rate / 25 × 100', kpis: [
            { name: 'ICP-fit MQL Rate', formula: 'MQLs from accounts matching defined ICP criteria / Total MQLs generated × 100' },
          ]},
          { name: 'Achieve active pipeline-generating presence in ≥2 new geographic or vertical markets by end of 2026', formula: 'New markets with qualified pipeline / 2 × 100', kpis: [
            { name: 'New Market Pipeline Rate', formula: 'New geographic or vertical markets with ≥1 qualified pipeline opportunity from active campaign presence / 2 × 100' },
          ]},
        ],
      },
      {
        name: 'Build cybersecurity thought leadership that generates measurable pipeline',
        formula: '(KR1 % + KR2 % + KR3 %) / 3',
        keyResults: [
          { name: 'Achieve ≥30% of closed-won deals with at least one documented content touchpoint in the buyer journey', formula: 'Current Content-Influenced Win Rate / 30 × 100', kpis: [
            { name: 'Content-Influenced Win Rate', formula: 'Closed-won deals with ≥1 documented content touchpoint / Total closed-won deals × 100' },
          ]},
          { name: 'Grow total combined engaged audience across owned channels by 30% from baseline', formula: 'Current Audience Growth Rate / 30 × 100', kpis: [
            { name: 'Engaged Audience Growth Rate', formula: '(Total combined engaged audience across email, LinkedIn, and events − Baseline) / Baseline × 100' },
          ]},
          { name: 'Secure ≥5 third-party analyst, media, or industry body mentions of InfoSec Ventures per quarter', formula: 'Current Quarterly Mentions / 5 × 100', kpis: [
            { name: 'Third-Party Mention Rate', formula: 'Analyst, media, and industry body mentions of InfoSec Ventures per quarter — target ≥5' },
          ]},
        ],
      },
      {
        name: 'Generate and convert qualified demand for InfoSec Ventures products',
        formula: '(KR1 % + KR2 % + KR3 % + KR4 %) / 4',
        keyResults: [
          { name: 'Achieve 20% year-on-year growth in Marketing Qualified Leads', formula: 'Current MQL Growth Rate / 20 × 100', kpis: [
            { name: 'MQL Growth Rate', formula: '(MQLs this period − MQLs same period last year) / MQLs same period last year × 100' },
          ]},
          { name: 'Achieve ≥35% Sales acceptance rate on Marketing Qualified Leads', formula: 'Current Sales Acceptance Rate / 35 × 100', kpis: [
            { name: 'MQL Sales Acceptance Rate', formula: 'MQLs accepted by Sales as qualified opportunities / Total MQLs passed to Sales × 100' },
          ]},
          { name: 'Reduce marketing cost per MQL by 20% from baseline', formula: '(Baseline Marketing Cost per MQL − Current) / Baseline Marketing Cost per MQL × 100 — target ≥20%', kpis: [
            { name: 'Marketing Cost per MQL Reduction Rate', formula: '(Baseline marketing cost per MQL − Current marketing cost per MQL) / Baseline marketing cost per MQL × 100' },
          ]},
          { name: 'Achieve ≥5x pipeline return on total marketing spend each quarter', formula: 'Current Pipeline ROI / 5 × 100', kpis: [
            { name: 'Marketing Pipeline ROI', formula: 'Total qualified pipeline value generated from marketing activity / Total marketing spend — target ≥5x' },
          ]},
        ],
      },
    ],
  },
];

// Existing department ID mapping
const EXISTING_DEPT_IDS: Record<string, string> = {
  'Product Management': '51d4f62b-abd1-4989-be3c-792d7d12690d',
  'Product Engineering': 'a88609ec-d343-4246-ba72-861099ced9a3',
  'Quality Assurance': '0a6a6113-291d-4fcb-93fb-ea02fa2e5f81',
  'Sales': '663a95ea-5e81-453b-8846-21c17528cd98',
  'Security & Technology': 'b8d59080-98e4-4d98-82c4-434a141f13b9',
};

const EXISTING_ORG_IDS: Record<string, string> = {
  'Drive Product Adoption and Retention': 'e340c9bc-d9b6-4b81-865d-caca5efac3c7',
  'Enhance Product Quality: Reliability, Security & Performance': '3aeda1b3-9036-4c3e-8e3b-83ee517506cc',
  'Expand Pipeline and Revenue Growth': '2cd046e1-e930-4806-8f97-266c7564377f',
  'Achieve Operational Excellence - People, Process, Technology': '3f59f176-8a82-4ff3-86d0-badac5733409',
};

export interface ImportProgress {
  step: string;
  detail: string;
}

export async function importV5Departments(
  onProgress?: (p: ImportProgress) => void
): Promise<{ success: boolean; summary: string; errors: string[] }> {
  const errors: string[] = [];
  let totalFOs = 0, totalKRs = 0, totalKPIs = 0;

  for (const dept of DEPARTMENTS) {
    if (PROTECTED_DEPARTMENTS.includes(dept.departmentName)) {
      continue; // Safety: never touch protected departments
    }

    onProgress?.({ step: dept.departmentName, detail: 'Processing...' });

    let departmentId: string;

    if (dept.isNew) {
      // Look up the active venture to link the new org objective
      const { data: ventureData } = await supabase
        .from('ventures')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      // Create new org objective
      onProgress?.({ step: dept.departmentName, detail: 'Creating org objective...' });
      const { data: orgData, error: orgErr } = await supabase
        .from('org_objectives')
        .insert({
          name: dept.orgObjectiveName,
          color: dept.newOrgColor || 'green',
          classification: 'CORE',
          venture_id: ventureData?.id || null,
        })
        .select('id')
        .single();

      if (orgErr || !orgData) {
        errors.push(`Failed to create org objective for ${dept.departmentName}: ${orgErr?.message}`);
        continue;
      }

      // Create new department
      const { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .insert({
          name: dept.departmentName,
          org_objective_id: orgData.id,
          color: dept.newOrgColor || 'green',
        })
        .select('id')
        .single();

      if (deptErr || !deptData) {
        errors.push(`Failed to create department ${dept.departmentName}: ${deptErr?.message}`);
        continue;
      }

      departmentId = deptData.id;
    } else {
      departmentId = EXISTING_DEPT_IDS[dept.departmentName];
      if (!departmentId) {
        errors.push(`Unknown department: ${dept.departmentName}`);
        continue;
      }

      // Delete existing hierarchy for this department (indicators → KRs → FOs)
      onProgress?.({ step: dept.departmentName, detail: 'Clearing existing hierarchy...' });

      // Get existing FO IDs for this department
      const { data: existingFOs } = await supabase
        .from('functional_objectives')
        .select('id')
        .eq('department_id', departmentId);

      if (existingFOs && existingFOs.length > 0) {
        const foIds = existingFOs.map(fo => fo.id);

        // Get KR IDs
        const { data: existingKRs } = await supabase
          .from('key_results')
          .select('id')
          .in('functional_objective_id', foIds);

        if (existingKRs && existingKRs.length > 0) {
          const krIds = existingKRs.map(kr => kr.id);

          // Delete indicators
          await supabase.from('indicators').delete().in('key_result_id', krIds);
          // Delete KRs
          await supabase.from('key_results').delete().in('functional_objective_id', foIds);
        }

        // Delete FOs
        await supabase.from('functional_objectives').delete().eq('department_id', departmentId);
      }
    }

    // Insert new hierarchy
    onProgress?.({ step: dept.departmentName, detail: 'Inserting FOs, KRs, and KPIs...' });

    for (const foDef of dept.functionalObjectives) {
      const { data: foData, error: foErr } = await supabase
        .from('functional_objectives')
        .insert({
          name: foDef.name,
          department_id: departmentId,
          formula: foDef.formula,
        })
        .select('id')
        .single();

      if (foErr || !foData) {
        errors.push(`Failed to create FO "${foDef.name}": ${foErr?.message}`);
        continue;
      }
      totalFOs++;

      for (const krDef of foDef.keyResults) {
        const { data: krData, error: krErr } = await supabase
          .from('key_results')
          .insert({
            name: krDef.name,
            functional_objective_id: foData.id,
            formula: krDef.formula,
            unit: '%',
          })
          .select('id')
          .single();

        if (krErr || !krData) {
          errors.push(`Failed to create KR "${krDef.name}": ${krErr?.message}`);
          continue;
        }
        totalKRs++;

        for (const kpiDef of krDef.kpis) {
          const { error: kpiErr } = await supabase
            .from('indicators')
            .insert({
              name: kpiDef.name,
              key_result_id: krData.id,
              formula: kpiDef.formula,
              tier: 'leading',
              frequency: 'Monthly',
              unit: '%',
            });

          if (kpiErr) {
            errors.push(`Failed to create KPI "${kpiDef.name}": ${kpiErr.message}`);
          } else {
            totalKPIs++;
          }
        }
      }
    }
  }

  const summary = `Imported ${totalFOs} FOs, ${totalKRs} KRs, ${totalKPIs} KPIs across ${DEPARTMENTS.filter(d => !PROTECTED_DEPARTMENTS.includes(d.departmentName)).length} departments`;
  
  return {
    success: errors.length === 0,
    summary,
    errors,
  };
}
