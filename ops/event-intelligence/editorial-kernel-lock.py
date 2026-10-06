"""Linux-only trusted launcher: exec the worker while retaining the kernel lock FD."""
import os,sys,json,hashlib,fcntl,stat
if sys.platform != 'linux': raise RuntimeError('Linux kernel lock required')
config_path,pin,expected_root,node_path,node_pin,worker_path,worker_pin=sys.argv[1:]
def pinned(file,pin,max_bytes):
 if os.path.islink(file): raise RuntimeError('Pinned input symlink refused')
 info=os.lstat(file)
 if not stat.S_ISREG(info.st_mode) or info.st_size>max_bytes: raise RuntimeError('Pinned input type/byte budget')
 with open(file,'rb') as handle:
  body=handle.read(max_bytes+1)
 if len(body)>max_bytes or len(body)!=info.st_size: raise RuntimeError('Pinned input changed/byte budget')
 if hashlib.sha256(body).hexdigest()!=pin: raise RuntimeError('Pinned input changed')
 return body
config=json.loads(pinned(config_path,pin,16384));root=os.path.realpath(config['root'])
if root!=os.path.realpath(expected_root) or config.get('lockMode')!='linux-kernel-v1': raise RuntimeError('Kernel root/mode mismatch')
if os.path.lexists(os.path.join(root,'service.lock')): raise RuntimeError('Legacy lock retained; busy')
marker=json.loads(pinned(os.path.join(root,'kernel-root.json'),config['kernelRootHash'],16384))
if marker!={'schemaVersion':1,'mode':'linux-kernel-v1','root':root}: raise RuntimeError('Fresh kernel root marker mismatch')
pinned(node_path,node_pin,150*1024*1024);pinned(worker_path,worker_pin,1024*1024)
lock_path=os.path.join(root,'kernel-advisory.lock');fd=os.open(lock_path,os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
if not stat.S_ISREG(os.fstat(fd).st_mode): raise RuntimeError('Kernel lock regular file required')
try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError: sys.exit(75)
os.set_inheritable(fd,True)
env=dict(os.environ);env['PI_EDITORIAL_KERNEL_FD']=str(fd)
os.execve(node_path,[node_path,worker_path,config_path,pin,expected_root],env)
