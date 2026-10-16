package com.goldproject.goldproject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class GoldprojectApplication {

	public static void main(String[] args) {
		SpringApplication.run(GoldprojectApplication.class, args);
	}

}
