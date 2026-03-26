package database

import (
	"log"

	"warthunder-server/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(dsn string) error {
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}
	return nil
}

func Close() {
	if DB != nil {
		sqlDB, _ := DB.DB()
		sqlDB.Close()
	}
}

func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Skin{},
		&models.Download{},
		&models.Favorite{},
		&models.Tag{},
		&models.SkinTag{},
		&models.SkinImage{},
		&models.Vehicle{},
		&models.SyncLog{},
		&models.SyncSession{},
		&models.SkinVehicle{},
	)
	if err != nil {
		return err
	}

	// 创建默认管理员账号
	createDefaultAdmin()
	return nil
}

func createDefaultAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("username = ?", "admin").Count(&count)
	if count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		admin := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			Nickname: "管理员",
		}
		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("创建默认管理员失败: %v", err)
		} else {
			log.Println("默认管理员账号已创建: admin / admin123")
		}
	}
}
