## 打包命令

```cmd

pnpm run build:file

tar -a -c -f $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip --exclude=dist.zip -C $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file .

scp "$env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip" jenkins@192.200.2.90:/usr/share/nginx/html/10.254.9.208/lottery

ssh jenkins@192.200.2.90

unzip /usr/share/nginx/html/10.254.9.208/lottery/dist.zip

```