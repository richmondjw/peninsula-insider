import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('handoff',Path(__file__).parents[1]/'scripts/research-handoff.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class HandoffTests(unittest.TestCase):
    def item(self):
        return {'key':'real question','readerQuestion':'Real question','status':'research_required','confidence':.9,'signals':{'provider':'jev'}}

    def test_no_low_confidence_or_fallback_intake(self):
        item=self.item();item['confidence']=.5
        self.assertIsNone(mod.intake(item))
        item['confidence']=.9;item['signals']['provider']='deterministic'
        self.assertIsNone(mod.intake(item))

    def test_idempotent_detected_only_no_overwrite(self):
        stored={};writes=[]
        def request(method,route,body):
            if method=='GET':return 200,list(stored.values())
            writes.append(body);stored[body['id']]=body
            return 201,[body]
        first=self.item();mod.handoff([first],request)
        again=self.item();mod.handoff([again],request)
        self.assertEqual(len(writes),1)
        self.assertEqual(writes[0]['state'],'detected')
        self.assertEqual(first['externalWorkItem'],again['externalWorkItem'])
        self.assertEqual(first['status'],'handed_off')

    def test_dry_run_cannot_write(self):
        def request(method,route,body):
            self.assertEqual(method,'GET');return 200,[]
        item=self.item();mod.handoff([item],request,True)
        self.assertEqual(item['status'],'research_required')

    def test_killed_work_is_not_reopened(self):
        item=self.item();payload=mod.intake(item);payload['state']='killed'
        mod.handoff([item],lambda *args:(200,[payload]))
        self.assertEqual(item['status'],'rejected')

if __name__=='__main__':unittest.main()
