#!/usr/bin/env bash
set -euo pipefail

# === Ajuste estes 3 valores ===
GITHUB_USER="leonardosantos-hdsd"         # seu usuário no GitHub
GITHUB_REPO="m03s04-docker"               # nome do repositório no GitHub
DOCKER_IMAGE_NAME="cadastro-produtos"     # nome do repositório no Docker Hub (após /usuario)

# === (Opcional) definir secrets localmente para enviar com gh secret set ===
# Deixe vazio para pular esta etapa; ou exporte antes de rodar:
#   export DOCKERHUB_USERNAME="leonardosantoshdsd"
#   export DOCKERHUB_TOKEN="seu-access-token"
: "${DOCKERHUB_USERNAME:=${DOCKERHUB_USERNAME:-}}"
: "${DOCKERHUB_TOKEN:=${DOCKERHUB_TOKEN:-}}"

# 1) Gera o arquivo do workflow
mkdir -p .github/workflows

cat > .github/workflows/docker-publish.yml <<'YAML'
name: Publish Docker image to Docker Hub

on:
  push:
    branches: ["main"]
    tags: ["v*.*.*"]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Prepare tags
        id: prep
        run: |
          IMAGE="${{ secrets.DOCKERHUB_USERNAME }}/${DOCKER_IMAGE_NAME:-cadastro-produtos}"
          SHA_TAG="${GITHUB_SHA::7}"
          TAGS="--tag ${IMAGE}:${SHA_TAG}"
          if [[ "${GITHUB_REF}" == "refs/heads/main" ]]; then
            TAGS="${TAGS} --tag ${IMAGE}:latest"
          fi
          if [[ "${GITHUB_REF}" == refs/tags/v* ]]; then
            VERSION="${GITHUB_REF#refs/tags/}"
            TAGS="${TAGS} --tag ${IMAGE}:${VERSION}"
          fi
          echo "IMAGE=${IMAGE}"    >> $GITHUB_OUTPUT
          echo "TAGS=${TAGS}"      >> $GITHUB_OUTPUT

      - name: Build and push
        run: |
          docker buildx build \
            --platform linux/amd64 \
            ${{ steps.prep.outputs.TAGS }} \
            --push \
            .
YAML

# 2) Substitui o placeholder DOCKER_IMAGE_NAME no YAML com o nome informado
# (mantém fallback para 'cadastro-produtos' se alguém editar o YAML manualmente)
sed -i.bak "s/\${DOCKER_IMAGE_NAME:-cadastro-produtos}/${DOCKER_IMAGE_NAME}/g" .github/workflows/docker-publish.yml
rm -f .github/workflows/docker-publish.yml.bak

# 3) (Opcional) Criar secrets via gh CLI se variáveis existirem
if command -v gh >/dev/null 2>&1; then
  echo "✔ gh CLI encontrado."
  if [[ -n "$DOCKERHUB_USERNAME" && -n "$DOCKERHUB_TOKEN" ]]; then
    echo "⏳ Enviando secrets para o repositório no GitHub..."
    gh repo set-default "${GITHUB_USER}/${GITHUB_REPO}" || true
    echo -n "$DOCKERHUB_USERNAME" | gh secret set DOCKERHUB_USERNAME --repo "${GITHUB_USER}/${GITHUB_REPO}" --body -
    echo -n "$DOCKERHUB_TOKEN"    | gh secret set DOCKERHUB_TOKEN    --repo "${GITHUB_USER}/${GITHUB_REPO}" --body -
    echo "✔ Secrets configurados: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN"
  else
    echo "⚠ Secrets NÃO enviados (variáveis DOCKERHUB_USERNAME/DOCKERHUB_TOKEN vazias)."
    echo "   Configure manualmente em: GitHub → Settings → Secrets and variables → Actions."
  fi
else
  echo "⚠ gh CLI não encontrado. Pulei o envio dos secrets."
  echo "   Instale: https://cli.github.com/ e rode: gh auth login"
fi

# 4) Commit e push do workflow
git add .github/workflows/docker-publish.yml
if ! git rev-parse --verify main >/dev/null 2>&1; then
  git checkout -b main
fi
git commit -m "chore(ci): add Docker Hub publish workflow"
git push -u origin main

echo
echo "✅ Workflow criado e enviado."
echo "   Repositório: https://github.com/${GITHUB_USER}/${GITHUB_REPO}/actions"
echo "   Dica: faça um push na branch main ou crie uma tag 'v1.0.0' para publicar também com tag semântica."
