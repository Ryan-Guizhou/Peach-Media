#!/usr/bin/env python3
"""Generate an editable source SVG for the three independent Peach Media entrances."""
from pathlib import Path
from xml.sax.saxutils import escape
W,H=1380,875
els=[]

def rect(x,y,w,h,fill,stroke='#d8e0f0',radius=17,width=1.2):
 els.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')
def label(x,y,text,size=19,color='#242b49',weight=650,anchor='start'):
 els.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}" font-family="Inter,Noto Sans SC,Microsoft YaHei,sans-serif">{escape(text)}</text>')
def line(x1,y1,x2,y2,color='#8998b5',dash='',arrow=True,width=2.2):
 dash_attr=f' stroke-dasharray="{dash}"' if dash else ''
 marker=' marker-end="url(#arrow)"' if arrow else ''
 els.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"{dash_attr}{marker}/>' )
def panel(x,y,w,h,kicker,title,details,accent):
 rect(x,y,w,h,'#fff','#dae2f0',16)
 rect(x+18,y+22,5,26,accent,accent,2,0)
 label(x+36,y+27,kicker,12,accent,800)
 label(x+24,y+70,title,22,'#20294c',750)
 for i,d in enumerate(details):label(x+24,y+103+i*21,d,12,'#707e9e',500)
header=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Peach Media 的三套独立产品入口与 OpenFeign 内部调用，RocketMQ、Peach Scheduler、容器执行架构"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9z" fill="#8799b8"/></marker><linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fafbff"/><stop offset="1" stop-color="#eff1ff"/></linearGradient></defs>'
rect(0,0,W,H,'url(#canvas)','none',0,0)
rect(38,34,1304,78,'#171d3b','#171d3b',18,0)
label(65,74,'Peach Media Cloud',25,'#fff',850)
label(65,95,'INDEPENDENT PRODUCT ENTRANCES · SHARED SAAS FOUNDATIONS',11,'#b6bdec',650)
label(1310,82,'ARCHITECTURE / PROPOSED',11,'#c5c4fd',650,'end')
label(52,145,'01  三套独立产品入口',14,'#6055d9',850)
panel(52,164,385,157,'ENTERPRISE / console.*','企业管理控制台',['资产 · 审核 · 任务 · 租户 · 用量','独立前端与企业业务 BFF'],'#6557df')
panel(498,164,385,157,'DEVELOPERS / developers.*','开发者平台',['应用 · API Key · SDK · Webhook','独立前端与开发者 BFF'],'#118f83')
panel(944,164,385,157,'REST SERVICE / api.*','Open API 服务',['/openapi/v1 · SDK · 第三方应用','独立鉴权/配额/限流/版本'],'#d97b64')
for x in [244,690,1136]:line(x,322,x,370)
label(52,366,'02  可信请求边界与同步服务调用',14,'#6055d9',850)
rect(52,383,831,98,'#f1efff','#cbc8f2')
label(70,410,'Console / Developer BFF + Peach Cloud Gateway',16,'#5147ba',750)
label(70,437,'统一登录 · 用户权限 · 租户/组织/项目上下文 · 内部 OpenFeign (HTTP)',12,'#6967a8',520)
label(70,457,'面向企业和开发者的独立 API 面，复用认证但不共享管理员权限',12,'#6967a8',520)
rect(944,383,385,98,'#fff0eb','#ffd5c8')
label(962,410,'Public Open API Gateway',16,'#b05a44',750)
label(962,438,'API Key / Scope / Project · 请求签名',12,'#936955',510)
label(962,458,'429 / 401 / 403 · Idempotency-Key',12,'#936955',510)
line(244,481,244,508);line(1136,481,1136,508)
label(52,512,'03  共享业务能力 / 统一数据边界',14,'#6055d9',850)
boxes=[('Peach Auth','租户 / 组织 / RBAC'),('Asset / FileService','元数据 / S3 / 校验'),('Media Processing','Job / Attempt / 状态'),('Usage / Webhook','用量账本 / 回调')]
for i,(title,subtitle) in enumerate(boxes):
 x=52+i*326
 rect(x,532,300,91,'#fff','#dce2ef',13)
 label(x+16,568,title,17,'#283256',750)
 label(x+16,597,subtitle,12,'#75819c',510)
for x in [202,528,854,1180]:line(x,624,x,661)
label(52,654,'04  消息/调度与容器化执行',14,'#6055d9',850)
rect(52,674,396,125,'#eaf9f6','#c7e8df',14)
label(72,711,'RocketMQ + Outbox',18,'#166c61',800)
label(72,738,'异步事件 · 削峰填谷 · 至少一次投递',12,'#48877f',520)
label(72,760,'幂等消费 / 重试 / DLQ',12,'#48877f',520)
rect(492,674,396,125,'#fff5e7','#f1ddbe',14)
label(512,711,'Peach Scheduler',18,'#9d6221',800)
label(512,738,'Cron / 延迟 / 依赖 / 集群租约',12,'#9d763f',520)
label(512,760,'通过 OpenFeign / 事件幂等创建任务',12,'#9d763f',520)
rect(932,674,397,125,'#eeeefe','#d9d6f9',14)
label(952,711,'Peach Compute',18,'#5647a4',800)
label(952,738,'Docker / Kubernetes Job',12,'#8475b5',520)
label(952,760,'Python / Go / FFmpeg / libvips Worker',12,'#8475b5',520)
line(450,741,488,741);line(890,741,929,741)
rect(52,819,1277,35,'#222b4e','#222b4e',10,0)
label(74,841,'MySQL  ·  Redis  ·  MinIO / S3  ·  Nacos  ·  Prometheus / Grafana  ·  SkyWalking',12,'#e3e8ff',650)
label(1310,841,'OPENFEIGN HTTP',10,'#edc5ba',650,'end')
svg=header+''.join(els)+'</svg>\n'
Path('docs/architecture/00-three-entry-architecture.svg').write_text(svg)
print('wrote docs/architecture/00-three-entry-architecture.svg')
