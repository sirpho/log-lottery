## 打包命令

```cmd

pnpm run build:file

tar -a -c -f $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip --exclude=dist.zip -C $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file .

scp "$env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip" jenkins@192.200.2.90:/usr/share/nginx/html/10.254.9.208/lottery

ssh jenkins@192.200.2.90

cd /usr/share/nginx/html/10.254.9.208/lottery

rm -rf ./assets ./css dog.svg  index.html  ./js  ./mp3  ./png  sw.js  vite.svg  ./wav

unzip /usr/share/nginx/html/10.254.9.208/lottery/dist.zip

```



## 发布docker
```
pnpm build:file
tar -a -c -f $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip --exclude=dist.zip -C $env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file .
scp "$env:SIRPHO_DOCUMENT\sirpho\log-lottery\dist-file\dist.zip" root@smtp.wptask.cyou:/var/www/html/lottery/dist

ssh root@smtp.wptask.cyou

cd /var/www/html/lottery
unzip /var/www/html/lottery/dist/dist.zip
rm /var/www/html/lottery/dist/dist.zip

docker build -t lottery:latest -f Dockerfile .
docker tag lottery:latest sirpho/lottery:latest
docker tag lottery:latest sirpho/lottery:2.1

docker push sirpho/lottery:latest
docker push sirpho/lottery:2.1

```

