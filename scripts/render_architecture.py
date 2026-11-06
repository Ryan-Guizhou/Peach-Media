#!/usr/bin/env python3
"""Generate source-of-truth editable SVG architecture diagrams for Peach Media."""
from pathlib import Path
import svgwrite

DEST=Path(__file__).resolve().parents[1]/'docs'/'architecture'
DEST.mkdir(parents=True,exist_ok=True)
COLORS={'navy':'#171c39','purple':'#6859e7','violet':'#8b75ee','peach':'#ff977b','green':'#16a78f','blue':'#3c83e5','gold':'#e9a940','paper':'#f7f8fc','white':'#ffffff','line':'#e1e5f1','muted':'#76809b'}
FONT='Noto Sans CJK SC,Microsoft YaHei,PingFang SC,sans-serif'

def base(name,title,subtitle,width=1380,height=820):
    dwg=svgwrite.Drawing(str(DEST/name),size=(width,height),viewBox=f'0 0 {width} {height}')
    dwg.add(dwg.rect(insert=(0,0),size=(width,height),fill='#f7f8fd'))
    dwg.add(dwg.rect(insert=(0,0),size=(width,105),fill='#181d3a'))
    dwg.add(dwg.text(title,insert=(45,52),fill='#fff',font_size='27px',font_family=FONT,font_weight='bold'))
    dwg.add(dwg.text(subtitle,insert=(45,83),fill='#b8c1eb',font_size='13px',font_family=FONT))
    dwg.add(dwg.text('Peach Media Cloud  •  PROPOSED ARCHITECTURE',insert=(width-42,height-21),fill=COLORS['muted'],font_size='11px',font_family=FONT,text_anchor='end'))
    arrow=dwg.marker(id='arrow',insert=(9,5),size=(10,10),orient='auto')
    arrow.add(dwg.path(d='M0,0 L10,5 L0,10 L3.5,5 Z',fill='#8f96b7'))
    dwg.defs.add(arrow)
    return dwg

def text(d,x,y,label,size=14,color=None,bold=False,anchor='start'):
    d.add(d.text(label,insert=(x,y),font_family=FONT,font_size=f'{size}px',fill=color or COLORS['navy'],font_weight='bold' if bold else 'normal',text_anchor=anchor))

def rect(d,x,y,w,h,title,desc='',accent='purple',dark=False,fs=17):
    if dark:
        fill=COLORS[accent];fg='#fff';muted='#e3e5fa';edge='none'
    else:
        fill='#fff';fg=COLORS['navy'];muted=COLORS['muted'];edge=COLORS['line']
    d.add(d.rect(insert=(x,y),size=(w,h),rx=13,ry=13,fill=fill,stroke=edge,stroke_width=1.5))
    d.add(d.rect(insert=(x,y),size=(6,h),rx=3,ry=3,fill=COLORS[accent]))
    lines=desc.split('\n') if desc else []
    text(d,x+18,y+31,title,fs,fg,True)
    for i,s in enumerate(lines):text(d,x+18,y+53+19*i,s,12,muted)
    return (x,y,w,h)

def arrow(d,x1,y1,x2,y2,label='',dash=False):
    opts={'stroke':'#8f96b7','stroke_width':2.5,'marker_end':'url(#arrow)'}
    if dash:opts['stroke_dasharray']='6 5'
    d.add(d.line(start=(x1,y1),end=(x2,y2),**opts))
    if label:text(d,(x1+x2)/2,(y1+y2)/2-8,label,12,COLORS['muted'],anchor='middle')

def area(d,x,y,w,h,title,fill='#fff',stroke='#dce1f1'):
    d.add(d.rect(insert=(x,y),size=(w,h),rx=18,ry=18,fill=fill,stroke=stroke,stroke_width=1.5))
    text(d,x+20,y+31,title,18,COLORS['navy'],True)

# 1 / Platform architecture
D=base('01-platform-overview.svg','整体平台架构','多租户 SaaS / Peach Cloud 复用 / 控制面、数据面与计算面分离',1380,840)
area(D,30,124,1320,92,'多端接入 · Consumers','#eef0ff')
for i,(title,desc) in enumerate([('企业控制台','资产 / 处理 / 运营'),('开发者门户','API Key / SDK'),('第三方系统','Open API / Webhook'),('运营平台','租户 / 套餐 / 审计')]):rect(D,52+i*327,165,304,41,title,'',accent='purple',fs=14)
arrow(D,690,216,690,252)
area(D,30,253,1320,171,'控制平面 · Java / Spring Cloud','#fff')
for i,x in enumerate([50,262,474,686,898,1110]):
    title,desc=[('Peach Gateway','鉴权 / 限流 / 防刷'),('Peach Auth','租户 / 组织 / 权限'),('Media Asset','资产 / 版本 / 元数据'),('OpenAPI','密钥 / SDK / 事件'),('Usage / Billing','配额 / 账本 / 套餐'),('Setting / Audit','配置 / 风险 / 追溯')][i]
    rect(D,x,315,190,82,title,desc,accent='blue' if i%2 else 'purple',fs=15)
arrow(D,345,427,345,472)
arrow(D,1032,427,1032,472)
area(D,30,472,646,195,'数据平面 · 大文件绕过业务 Gateway','#eef9f6')
area(D,704,472,646,195,'计算平面 · 异步 + 容器化处理','#f3efff')
rect(D,48,525,190,105,'Upload API','预签名 / 分片\n断点续传 / 隔离区','green')
rect(D,252,525,190,105,'Object Storage','MinIO / S3 / OSS\n原始与衍生文件','green')
rect(D,456,525,194,105,'Delivery / CDN','签名 URL / HLS\n动态转换 / 缓存','green')
arrow(D,238,577,248,577);arrow(D,442,577,452,577)
rect(D,721,525,190,105,'RocketMQ','Outbox / 削峰\n事件消费 / 重试','purple')
rect(D,925,525,190,105,'Peach Compute','调度 / 配额\n执行租约 / Attempt','purple')
rect(D,1129,525,202,105,'Worker Runtime','Docker / Kubernetes\nPython / Go / FFmpeg','purple')
arrow(D,910,577,921,577);arrow(D,1115,577,1125,577)
arrow(D,690,676,690,711)
area(D,30,710,1320,97,'基础设施 / Governance','#fff')
for i,(name,label) in enumerate([('MySQL','关系业务数据'),('Redis','缓存 / 配额'),('Nacos','注册与配置'),('OTRYX Flow','周期与 DAG'),('Prometheus','系统指标'),('SkyWalking / Loki','链路与日志')]):
    x=52+i*214; rect(D,x,747,200,49,name,'',accent='peach',fs=13)
D.save()

# 2 / Compute execution
D=base('02-compute-runtime.svg','分布式容器计算架构','RocketMQ 派发 / 租户公平调度 / Docker Agent 与 Kubernetes Job 双运行时',1380,825)
area(D,24,130,305,565,'调度控制面 · Java','#fff')
rect(D,44,182,264,78,'处理任务 Job','tenantId / processor / priority','purple')
rect(D,44,287,264,82,'事务 Outbox','原子保存任务与待发事件','blue')
rect(D,44,393,264,82,'RocketMQ Consumer','至少一次投递 / 幂等租约','blue')
rect(D,44,500,264,108,'Peach Compute Scheduler','资源配额 / 权重公平 / 背压\nAttempt / 状态恢复','purple')
for y1,y2 in [(260,287),(369,393),(475,500)]:arrow(D,175,y1,175,y2)
area(D,359,130,398,565,'容器运行时适配层','#f2efff')
rect(D,379,183,358,107,'Docker Runtime Agent','单机 / 轻量部署 /受限 Engine API\n常驻 Worker / 独立 Container','blue')
rect(D,379,326,358,107,'Kubernetes Runtime','Job / Pod / ResourceQuota\nPod Security / 最小 RBAC','purple')
rect(D,379,474,358,109,'资源状态与租约对账','容器创建与业务成功分离\n超时、重复执行、取消与恢复','peach')
arrow(D,329,554,355,235,'本地');arrow(D,329,553,355,377,'集群')
area(D,789,130,562,565,'执行层 · 隔离的媒体处理容器','#edf9f7')
for j,(name,desc) in enumerate([('Python Worker','OCR / 数据分析'),('Go Worker','高吞吐文件处理'),('FFmpeg Worker','视频 / 音频转码'),('Image Worker','libvips 图片转换'),('Document Worker','Office / PDF 预览'),('Custom Worker','未来：审核后的自定义镜像')]):
    x=810+(j%2)*268;y=180+(j//2)*143
    rect(D,x,y,246,112,name,desc+'\nCPU / Memory / Ephemeral',accent='green' if j%2==0 else 'blue',fs=15)
arrow(D,758,377,785,377)
area(D,30,712,1320,83,'文件与结果存储 · 原始对象 / 尝试目录 / 输出 Manifest / 正式发布','#fff')
for i,(x,name) in enumerate([(52,'MinIO / S3'),(286,'Input Manifest'),(520,'Attempt 输出'),(754,'产物验证'),(988,'Asset Release')]):
    rect(D,x,753,214,31,name,'',accent='peach',fs=12)
    if i:arrow(D,x-20,768,x-3,768)
D.save()

# 3 / Lifecycle
D=base('03-asset-data-loop.svg','媒体数据全生命周期闭环','上传与安全扫描 → 异步处理 → 资产发布 → API/CDN 交付 → Webhook / 用量 / 审计',1380,790)
steps=[('接入','上传 / API / SDK','签名与分片'),('暂存','隔离区 / 对象存储','完整性 / MIME'),('扫描','ClamAV / 安全检查','通过后进入处理'),('编排','Outbox / RocketMQ','任务状态机 / 调度'),('处理','Python / Go / FFmpeg','独立 Attempt'),('发布','资产版本 / 衍生资源','元数据索引'),('交付','私有签名 / CDN','HLS / 动态转换')]
for i,(name,a,b) in enumerate(steps):
    x=29+i*193
    rect(D,x,183,172,135,name,f'{a}\n{b}',accent=['blue','purple','peach','purple','green','blue','green'][i],fs=20)
    if i:arrow(D,x-17,250,x-4,250)
area(D,30,391,645,200,'异步事件回路','#fff')
area(D,705,391,645,200,'用量与治理回路','#fff')
for i,(x,y,title,desc) in enumerate([(48,454,'Webhook 投递','签名 / 重试 / 死信'),(265,454,'第三方上报','Event ID / 批量接收'),(723,454,'用量账本','事件归档 / 聚合'),(940,454,'权限与审计','tenantId / API / 操作')]):rect(D,x,y,193,96,title,desc,accent='purple' if i<2 else 'peach',fs=16)
arrow(D,418,390,418,370)
arrow(D,1027,391,1027,371)
area(D,30,628,1320,126,'一致性与故障恢复边界','#fff')
for i,(name,desc) in enumerate([('事务 Outbox','防止数据提交后消息丢失'),('租约与幂等','至少一次消费，效果可去重'),('Saga / 补偿','配额预留、释放与资产清理'),('对账修复','对象与数据库状态定期核对')]):rect(D,51+i*329,674,300,65,name,desc,accent='peach',fs=14)
D.save()

# 4 / Tenant and privilege
D=base('04-tenant-security.svg','多租户与权限隔离模型','租户是安全边界；公司/组织是管理结构；资源授权叠加 API、按钮、字段、数据范围',1380,765)
area(D,30,124,1320,120,'统一认证与授权入口','#eef0ff')
for i,(n,desc) in enumerate([('Human Identity','会话 / 用户 / 多组织归属'),('Machine Identity','项目级 API Key / Scope'),('Platform Role','租户运营管理员 / 审计')]):rect(D,54+i*426,163,399,65,n,desc,accent='purple',fs=15)
area(D,30,289,630,300,'Tenant A · 企业资产与计算空间','#ecf9f5')
area(D,690,289,660,300,'Tenant B · 企业资产与计算空间','#f2eeff')
for x,tenantname in [(52,'星辰创意集团'),(713,'青柠数字科技')]:
    rect(D,x,335,286,68,'Organization Tree',tenantname+' / 部门 / 兼属','green' if x<500 else 'purple',fs=15)
    rect(D,x+293,335,282,68,'Project Scopes','生产 / 测试环境 / API Key','green' if x<500 else 'purple',fs=15)
    rect(D,x,439,286,88,'DAM Resource ACL','资产库 / 目录 / 字段 / 按钮\n创建人 / 项目成员 / 可见性','green' if x<500 else 'purple',fs=15)
    rect(D,x+293,439,282,88,'Compute Quota','容器 / CPU / 内存 / 临时盘\n并发任务与优先级','green' if x<500 else 'purple',fs=15)
arrow(D,340,245,340,282)
arrow(D,1040,245,1040,282)
area(D,30,623,1320,109,'始终生效的安全约束','#fff')
text(D,58,680,'强制 tenantId 过滤     •     可信身份传播     •     后端授权校验     •     对象访问签名     •     消息/缓存/任务隔离     •     审计追踪',16,COLORS['navy'],True)
D.save()
print('\n'.join(str(p) for p in DEST.glob('*.svg')))
