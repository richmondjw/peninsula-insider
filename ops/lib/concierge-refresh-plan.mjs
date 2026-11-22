/** Pure preparation only. No environment, credentials, job dispatch or activation. */
export function planEventRefresh({trigger,publication,checkedOutCommit,runId}) {
  if(!['daily','post-publish'].includes(trigger))throw Error('unsupported refresh trigger');
  if(!publication||publication.environment!=='production'||publication.conclusion!=='success'
    ||!/^https:\/\//.test(publication.receiptUrl??'')
    ||!/^[a-f0-9]{40}$/.test(publication.sourceCommit??''))throw Error('verified publication receipt required');
  if(checkedOutCommit!==publication.sourceCommit)throw Error('checkout differs from published source');
  if(typeof runId!=='string'||!runId.trim())throw Error('run identity required');
  return Object.freeze({schemaVersion:1,mode:'offline-plan',activationAllowed:false,
    trigger,sourceCommit:publication.sourceCommit,publicationReceipt:publication.receiptUrl,
    snapshotId:`events-${runId}`,concurrencyGroup:'concierge-corpus',
    existingCron:'30 16 * * *',requires:['managed-postgrest','complete-role-visible-export',
      'cross-project-cms-race-policy','paired-reader-writer-release','live-answer-acceptance','actual-scheduled-execution']});
}
