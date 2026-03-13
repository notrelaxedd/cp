// TODO: Restore PlanGate component when Stripe is re-integrated.
// This component should wrap feature UI and show an upgrade prompt
// when the user's plan doesn't include the feature. Previously it
// accepted props: { children, allowed, featureName, currentPlan }
// and rendered a blurred overlay with an "Upgrade Plan" link when
// allowed was false.
//
// Example usage:
//   <PlanGate allowed={plan.limits.exportCsv} featureName="CSV Export" currentPlan={plan.name}>
//     <ExportButton />
//   </PlanGate>
