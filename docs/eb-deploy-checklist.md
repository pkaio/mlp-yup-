# AWS Elastic Beanstalk Deployment Checklist (MLP v1)

## 1. Pré-requisitos
- Conta AWS com acesso a Elastic Beanstalk, RDS, S3, CloudWatch e IAM.
- AWS CLI configurado (perfil com permissões administrativas limitadas).
- Variáveis `.env` revisadas e seguras; nunca subir secrets para o repositório.

## 2. Infraestrutura Base
1. **Elastic Beanstalk (EB)**
   - Criar ambiente Node.js 18.x (ou versão compatível com Express).
   - Ativar *rolling updates* e *enhanced health reporting*.
   - Habilitar *Managed Updates* com janela em horário de menor uso.
2. **RDS (PostgreSQL)**
   - Escolher classe `db.t3.small` (ou equivalente) para ambiente MLP.
   - Habilitar *Multi-AZ* se orçamento permitir; snapshot automático diário.
   - Criar Security Group (SG) próprio; liberar tráfego **somente** do SG do EB.
3. **S3 (Uploads Privados)**
   - Bucket privado (ex.: `yup-mlp-uploads`) na mesma região do EB.
   - Configurar versionamento + lifecycle (expirar arquivos temporários).
   - Definir política de bucket que permita PUT/GET apenas via IAM Role do EB.

## 3. Variáveis de Ambiente (EB → Configuration → Software)
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<secret forte>
DATABASE_URL=postgres://<user>:<password>@<host>:5432/<db>
AWS_REGION=<ex.: sa-east-1>
UPLOADS_BUCKET=yup-mlp-uploads
FRONTEND_URL=https://app.yup.com,https://staging.yup.com
S3_PRESIGN_EXPIRATION=900
LOG_LEVEL=info
```
- Revisar `DATABASE_URL` com SSL habilitado se RDS exigir (`?ssl=true`).
- Para desenvolvimento local manter `.env` separado e fora do GIT.

## 4. Rede, Segurança e CORS
- Associar SG do EB ao SG do RDS (porta 5432) — nenhuma outra origem deve ter acesso.
- Criar Role IAM para instâncias EB com políticas:
  - `AmazonS3FullAccess` **(ajustar para política mínima recomendada)**.
  - `CloudWatchLogsFullAccess`.
- Ajustar middleware CORS (`backend/server.js`) via `FRONTEND_URL`; `*` apenas em ambientes dev/labs.
- Configurar HTTPS (ACM + Load Balancer) antes de abrir tráfego público.

## 5. Observabilidade
1. **CloudWatch Logs**
   - Ativar streaming do EB para Log Group (`/aws/elasticbeanstalk/yup-mlp`).
   - Criar subscription filter com termo `"error"` para facilitar consultas rápidas.
2. **Alarmes**
   - `ELB 5xx Errors > 10 por 5 minutos` → SNS (Slack/Email).
   - `RDS Free Storage < 20%` → SNS.
3. **Dashboards**
   - Gráficos básicos: latência média, 5xx por minuto, CPU/Memory do EB.

## 6. Playbook de Rollback
1. Monitorou instabilidade (dash/alarme)?
2. Identificar release (versão EB recém implantada).
3. No EB:
   - `Actions → Restore to Previous Version`.
   - Confirmar que instâncias ficam em *ok* e health volta para *green*.
4. Verificar RDS (sem migrations irreversíveis). Em caso crítico, executar:
   - `aws rds restore-db-instance-to-point-in-time` usando snapshot mais recente.
5. Abrir incidente no documento compartilhado; registrar causa e próximos passos.

## 7. Validação Pós-Deploy
- `curl https://api.yup.com/health` retorna 200 com timestamp.
- `curl https://api.yup.com/api/db-check` retorna 200 (latência reportada < 200ms).
- Upload S3 (via rota presign) validado com vídeo de teste.
- Log de acesso aparece em CloudWatch em até 1 minuto.
- Alarme de teste (`Test notification`) entregue no canal definido.

## 8. Próximos Passos
- Automatizar deploy com GitHub Actions (EB Deploy + tests).
- Implementar *blue/green deployment* para minimizar downtime.
- Revisitar políticas IAM para restringir apenas às ações necessárias.
