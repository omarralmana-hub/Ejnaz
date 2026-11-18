/* Department presets. Each preset is a complete starting setup: categories (with colours, the label of the reference-number
   field, and the actions offered), and which KPI "squares" are shown. People can edit everything afterwards in
   ⋯ → Department setup, and share their setup as a template file.

   A category's `id` is what is stored on each record (keep it stable once records exist). `name` is only for display.
   Colours are the app's palette: c1 blue, c2 green, c3 amber, c4 red, c5 purple, c6 teal, c7 sand, c8 grey.
   KPI types: total, done, open, overdue, rate, days, hours, and { t:'cat', id } for one category. */
window.SIJIL_PRESETS = {
  legal: {
    name: { ar: 'الإدارة القانونية', en: 'Legal' },
    cats: [
      { id: 'عقود', name: { ar: 'عقود', en: 'Contracts' }, color: 'c1', ref: { ar: 'رقم العقد', en: 'Contract no.' }, acts: [
        { ar: 'مراجعة عقد', en: 'Contract review' }, { ar: 'صياغة عقد', en: 'Contract drafting' }, { ar: 'ملحق / تعديل', en: 'Addendum / amendment' },
        { ar: 'تجديد / تمديد', en: 'Renewal / extension' }, { ar: 'مقارنة نسخ', en: 'Version comparison' }, { ar: 'إبداء رأي', en: 'Legal opinion' }] },
      { id: 'خطابات', name: { ar: 'خطابات', en: 'Letters' }, color: 'c3', ref: { ar: 'رقم الخطاب', en: 'Letter no.' }, acts: [
        { ar: 'خطاب صادر', en: 'Outgoing letter' }, { ar: 'رد على خطاب', en: 'Reply to letter' }, { ar: 'إنذار / إخطار', en: 'Warning / notice' }, { ar: 'مذكرة داخلية', en: 'Internal memo' }] },
      { id: 'تحقيقات', name: { ar: 'تحقيقات', en: 'Investigations' }, color: 'c4', ref: { ar: 'رقم القضية', en: 'Case no.' }, acts: [
        { ar: 'فتح تحقيق', en: 'Open investigation' }, { ar: 'جلسة تحقيق', en: 'Investigation session' }, { ar: 'محضر تحقيق', en: 'Investigation minutes' },
        { ar: 'توصية / قرار', en: 'Recommendation / decision' }, { ar: 'متابعة تحقيق', en: 'Investigation follow-up' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [
        { ar: 'اجتماع', en: 'Meeting' }, { ar: 'استشارة', en: 'Consultation' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'cat', id: 'عقود' }, { t: 'cat', id: 'خطابات' }, { t: 'cat', id: 'تحقيقات' }, { t: 'days' }, { t: 'open' }]
  },
  hr: {
    name: { ar: 'الموارد البشرية', en: 'Human Resources' },
    cats: [
      { id: 'hr-recruit', name: { ar: 'التوظيف', en: 'Recruitment' }, color: 'c1', ref: { ar: 'رقم الطلب', en: 'Requisition no.' }, acts: [
        { ar: 'فرز السير الذاتية', en: 'CV screening' }, { ar: 'مقابلة', en: 'Interview' }, { ar: 'عرض وظيفي', en: 'Job offer' }, { ar: 'مباشرة موظف', en: 'Onboarding' }] },
      { id: 'hr-relations', name: { ar: 'علاقات الموظفين', en: 'Employee relations' }, color: 'c3', ref: { ar: 'رقم الحالة', en: 'Case no.' }, acts: [
        { ar: 'شكوى', en: 'Complaint' }, { ar: 'إجراء تأديبي', en: 'Disciplinary action' }, { ar: 'تقييم أداء', en: 'Performance review' }, { ar: 'إنهاء خدمة', en: 'Termination' }] },
      { id: 'hr-payroll', name: { ar: 'الرواتب والمزايا', en: 'Payroll & benefits' }, color: 'c2', ref: { ar: 'رقم المعاملة', en: 'Transaction no.' }, acts: [
        { ar: 'مسير الرواتب', en: 'Payroll run' }, { ar: 'بدلات ومزايا', en: 'Allowances & benefits' }, { ar: 'تأمين طبي', en: 'Medical insurance' }, { ar: 'نهاية خدمة', en: 'End of service' }] },
      { id: 'hr-training', name: { ar: 'التدريب والتطوير', en: 'Training & development' }, color: 'c5', ref: { ar: 'رقم الدورة', en: 'Course no.' }, acts: [
        { ar: 'تنظيم دورة', en: 'Organise a course' }, { ar: 'تقييم احتياج', en: 'Needs assessment' }, { ar: 'متابعة تدريب', en: 'Training follow-up' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [
        { ar: 'اجتماع', en: 'Meeting' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'cat', id: 'hr-recruit' }, { t: 'cat', id: 'hr-relations' }, { t: 'cat', id: 'hr-payroll' }, { t: 'open' }, { t: 'todo' }]
  },
  finance: {
    name: { ar: 'المالية', en: 'Finance' },
    cats: [
      { id: 'fin-payable', name: { ar: 'الحسابات الدائنة', en: 'Accounts payable' }, color: 'c4', ref: { ar: 'رقم الفاتورة', en: 'Invoice no.' }, acts: [
        { ar: 'مراجعة فاتورة', en: 'Invoice review' }, { ar: 'اعتماد دفعة', en: 'Payment approval' }, { ar: 'مطابقة موردين', en: 'Vendor reconciliation' }] },
      { id: 'fin-receivable', name: { ar: 'الحسابات المدينة', en: 'Accounts receivable' }, color: 'c2', ref: { ar: 'رقم الفاتورة', en: 'Invoice no.' }, acts: [
        { ar: 'إصدار فاتورة', en: 'Issue invoice' }, { ar: 'تحصيل', en: 'Collection' }, { ar: 'متابعة متأخرات', en: 'Overdue follow-up' }] },
      { id: 'fin-reporting', name: { ar: 'التقارير والتدقيق', en: 'Reporting & audit' }, color: 'c1', ref: { ar: 'رقم التقرير', en: 'Report no.' }, acts: [
        { ar: 'تقرير شهري', en: 'Monthly report' }, { ar: 'إقفال', en: 'Closing' }, { ar: 'رد على تدقيق', en: 'Audit response' }] },
      { id: 'fin-budget', name: { ar: 'الميزانية', en: 'Budgeting' }, color: 'c5', ref: { ar: 'رقم الميزانية', en: 'Budget ref.' }, acts: [
        { ar: 'إعداد ميزانية', en: 'Budget preparation' }, { ar: 'متابعة صرف', en: 'Spend tracking' }, { ar: 'تعديل ميزانية', en: 'Budget revision' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [
        { ar: 'اجتماع', en: 'Meeting' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'cat', id: 'fin-payable' }, { t: 'cat', id: 'fin-receivable' }, { t: 'cat', id: 'fin-reporting' }, { t: 'overdue' }, { t: 'days' }]
  },
  it: {
    name: { ar: 'تقنية المعلومات', en: 'IT & Support' },
    cats: [
      { id: 'it-tickets', name: { ar: 'طلبات الدعم', en: 'Support tickets' }, color: 'c1', ref: { ar: 'رقم التذكرة', en: 'Ticket no.' }, acts: [
        { ar: 'حل مشكلة', en: 'Resolve issue' }, { ar: 'تصعيد', en: 'Escalation' }, { ar: 'طلب خدمة', en: 'Service request' }] },
      { id: 'it-projects', name: { ar: 'المشاريع', en: 'Projects' }, color: 'c5', ref: { ar: 'رقم المشروع', en: 'Project no.' }, acts: [
        { ar: 'تحليل متطلبات', en: 'Requirements' }, { ar: 'تطوير', en: 'Development' }, { ar: 'اختبار', en: 'Testing' }, { ar: 'إطلاق', en: 'Release' }] },
      { id: 'it-infra', name: { ar: 'البنية التحتية', en: 'Infrastructure' }, color: 'c6', ref: { ar: 'رقم التغيير', en: 'Change no.' }, acts: [
        { ar: 'صيانة', en: 'Maintenance' }, { ar: 'ترقية', en: 'Upgrade' }, { ar: 'نسخ احتياطي', en: 'Backup' }] },
      { id: 'it-security', name: { ar: 'الأمن السيبراني', en: 'Security' }, color: 'c4', ref: { ar: 'رقم الحادثة', en: 'Incident no.' }, acts: [
        { ar: 'معالجة حادثة', en: 'Incident handling' }, { ar: 'مراجعة صلاحيات', en: 'Access review' }, { ar: 'تحديثات أمنية', en: 'Security patching' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [
        { ar: 'اجتماع', en: 'Meeting' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'cat', id: 'it-tickets' }, { t: 'cat', id: 'it-projects' }, { t: 'cat', id: 'it-security' }, { t: 'open' }, { t: 'todo' }]
  },
  procurement: {
    name: { ar: 'المشتريات', en: 'Procurement' },
    cats: [
      { id: 'pr-tenders', name: { ar: 'المناقصات', en: 'Tenders' }, color: 'c1', ref: { ar: 'رقم المناقصة', en: 'Tender no.' }, acts: [
        { ar: 'إعداد كراسة', en: 'Prepare documents' }, { ar: 'تقييم عروض', en: 'Bid evaluation' }, { ar: 'ترسية', en: 'Award' }] },
      { id: 'pr-orders', name: { ar: 'أوامر الشراء', en: 'Purchase orders' }, color: 'c2', ref: { ar: 'رقم الأمر', en: 'PO no.' }, acts: [
        { ar: 'إصدار أمر', en: 'Issue order' }, { ar: 'متابعة توريد', en: 'Delivery follow-up' }, { ar: 'استلام', en: 'Receiving' }] },
      { id: 'pr-vendors', name: { ar: 'الموردون', en: 'Vendors' }, color: 'c3', ref: { ar: 'رقم المورد', en: 'Vendor no.' }, acts: [
        { ar: 'تأهيل مورد', en: 'Vendor qualification' }, { ar: 'تقييم أداء', en: 'Performance review' }, { ar: 'تفاوض', en: 'Negotiation' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [
        { ar: 'اجتماع', en: 'Meeting' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'cat', id: 'pr-tenders' }, { t: 'cat', id: 'pr-orders' }, { t: 'cat', id: 'pr-vendors' }, { t: 'overdue' }, { t: 'days' }]
  },
  generic: {
    name: { ar: 'عام', en: 'General' },
    cats: [
      { id: 'gen-tasks', name: { ar: 'مهام', en: 'Tasks' }, color: 'c1', ref: { ar: 'الرقم المرجعي', en: 'Reference no.' }, acts: [
        { ar: 'تنفيذ', en: 'Execution' }, { ar: 'متابعة', en: 'Follow-up' }, { ar: 'مراجعة', en: 'Review' }] },
      { id: 'gen-meetings', name: { ar: 'اجتماعات', en: 'Meetings' }, color: 'c5', ref: { ar: 'المرجع', en: 'Reference' }, acts: [
        { ar: 'اجتماع داخلي', en: 'Internal meeting' }, { ar: 'اجتماع خارجي', en: 'External meeting' }] },
      { id: 'gen-reports', name: { ar: 'تقارير', en: 'Reports' }, color: 'c2', ref: { ar: 'رقم التقرير', en: 'Report no.' }, acts: [
        { ar: 'إعداد تقرير', en: 'Prepare report' }, { ar: 'عرض', en: 'Presentation' }] },
      { id: 'أخرى', name: { ar: 'أخرى', en: 'Other' }, color: 'c8', ref: { ar: 'المرجع', en: 'Reference' }, other: true, acts: [{ ar: 'أخرى', en: 'Other' }] }
    ],
    kpis: [{ t: 'total' }, { t: 'done' }, { t: 'open' }, { t: 'overdue' }, { t: 'days' }, { t: 'todo' }]
  }
};
