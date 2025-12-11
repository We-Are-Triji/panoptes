# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["Panoptes.Api/Panoptes.Api.csproj", "Panoptes.Api/"]
COPY ["Panoptes.Core/Panoptes.Core.csproj", "Panoptes.Core/"]
COPY ["Panoptes.Infrastructure/Panoptes.Infrastructure.csproj", "Panoptes.Infrastructure/"]
RUN dotnet restore "Panoptes.Api/Panoptes.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/Panoptes.Api"
RUN dotnet build "Panoptes.Api.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "Panoptes.Api.csproj" -c Release -o /app/publish

# Final Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Panoptes.Api.dll"]