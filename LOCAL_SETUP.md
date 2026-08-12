# Execução local no Windows com TiDB Cloud

> Este guia usa o **TiDB Cloud** pelo conector MySQL do Prisma. Não compartilhe o arquivo `.env`, o certificado ou a URL de conexão.

## 1. Preparar a configuração local

No PowerShell, dentro da pasta do projeto, copie o modelo versionado e abra o arquivo de configuração local:

```powershell
Copy-Item env.local.example.txt .env
code .env
```

Na aba **Connect** do TiDB Cloud, arquive o certificado CA se desejar, mas o Prisma usa TLS estrito diretamente pela URL. Abra o arquivo `.env` no VS Code e substitua os valores de exemplo. Use a URL completa da aba **Connection String** do TiDB Cloud, pois ela já trata caracteres especiais da senha corretamente.

```dotenv
DATABASE_URL=mysql://USUARIO:SENHA@HOST:4000/sys?sslaccept=strict
LOCAL_AUTH_ENABLED=true
LOCAL_ADMIN_NAME=Administrador Local
LOCAL_ADMIN_EMAIL=admin@local.test
JWT_SECRET=troque-por-uma-chave-local-aleatoria
```

| Variável | O que preencher |
|---|---|
| `DATABASE_URL` | A URL completa da aba **Connection String** do TiDB Cloud, mantendo `sslaccept=strict`. |
| `LOCAL_AUTH_ENABLED` | Mantenha `true` para testes somente em `pnpm dev`. |
| `LOCAL_ADMIN_NAME` e `LOCAL_ADMIN_EMAIL` | Seus dados de teste. |
| `JWT_SECRET` | Uma chave aleatória gerada no terminal. |

Para gerar uma chave local, execute:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para `JWT_SECRET` no `.env`.

## 2. Criar tabelas e iniciar

Com o `.env` salvo, aplique as migrações e inicie o sistema:

```powershell
pnpm db:migrate-local
pnpm dev
```

Abra `http://localhost:3000`. O comando `pnpm dev` funciona no Windows, macOS e Linux. Com `LOCAL_AUTH_ENABLED=true`, o sistema cria e usa automaticamente um administrador local **apenas durante o desenvolvimento**, sem usar OAuth.

## 3. Segurança antes do GitHub

O `.gitignore` já exclui `.env` e certificados. Antes de qualquer `git add`, confirme:

```powershell
git status
```

Não deve aparecer `.env` nem arquivos dentro de `certs`.

## 4. Comportamento do modo local

Com `LOCAL_AUTH_ENABLED=true`, a aplicação ignora OAuth e usa automaticamente o administrador local durante o desenvolvimento. Analytics gerenciado também não é carregado nesse modo. Os quatro segmentos padrão são criados de forma idempotente, portanto reiniciar o servidor não duplica registros.
