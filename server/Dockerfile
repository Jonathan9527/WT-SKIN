# 构建阶段
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 安装依赖（go-sqlite3 需要 CGO）
RUN apk add --no-cache gcc musl-dev sqlite-dev

# 复制 go.mod 和 go.sum
COPY go.mod go.sum* ./
RUN go mod download

# 复制源代码
COPY . .

# 构建（启用 CGO 以支持 go-sqlite3）
RUN CGO_ENABLED=1 GOOS=linux go build -a -o main .

# 运行阶段
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata sqlite-libs
ENV TZ=Asia/Shanghai

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 复制数据文件
COPY --from=builder /app/data ./data

# 创建数据包输出目录
RUN mkdir -p /app/data/packs

EXPOSE 8080

CMD ["./main"]
