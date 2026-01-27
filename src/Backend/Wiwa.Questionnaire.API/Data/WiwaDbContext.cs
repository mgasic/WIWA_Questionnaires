using Microsoft.EntityFrameworkCore;
using Wiwa.Questionnaire.API.Domain;
using QuestionnaireEntity = Wiwa.Questionnaire.API.Domain.Questionnaire;

namespace Wiwa.Questionnaire.API.Data;

public class WiwaDbContext : DbContext
{
    public WiwaDbContext(DbContextOptions<WiwaDbContext> options) : base(options)
    {
    }

    public DbSet<QuestionnaireType> QuestionnaireTypes { get; set; }
    public DbSet<QuestionnaireEntity> Questionnaires { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<SpecificQuestionType> SpecificQuestionTypes { get; set; }
    public DbSet<QuestionFormat> QuestionFormats { get; set; }
    public DbSet<PredefinedAnswer> PredefinedAnswers { get; set; }
    public DbSet<PredefinedAnswerSubQuestion> PredefinedAnswerSubQuestions { get; set; }
    public DbSet<QuestionComputedConfig> QuestionComputedConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // QuestionnaireType
        modelBuilder.Entity<QuestionnaireType>(entity =>
        {
            entity.HasKey(e => e.QuestionnaireTypeID);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
        });

        // SpecificQuestionType
        modelBuilder.Entity<SpecificQuestionType>(entity =>
        {
            entity.HasKey(e => e.SpecificQuestionTypeID);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
        });

        // QuestionFormat
        modelBuilder.Entity<QuestionFormat>(entity =>
        {
            entity.HasKey(e => e.QuestionFormatID);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
        });

        // Question
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.QuestionID);
            entity.Property(e => e.QuestionText).IsRequired().HasMaxLength(500);
            entity.Property(e => e.QuestionLabel).HasMaxLength(50);
            
            entity.HasOne(d => d.QuestionFormat)
                .WithMany()
                .HasForeignKey(d => d.QuestionFormatID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.ParentQuestion)
                .WithMany(p => p.SubQuestions)
                .HasForeignKey(d => d.ParentQuestionID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // PredefinedAnswer
        modelBuilder.Entity<PredefinedAnswer>(entity =>
        {
            entity.HasKey(e => e.PredefinedAnswerID);
            entity.Property(e => e.Answer).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Code).HasMaxLength(20);
            entity.Property(e => e.StatisticalWeight).HasColumnType("decimal(18,2)");

            entity.HasOne(d => d.Question)
                .WithMany(p => p.PredefinedAnswers)
                .HasForeignKey(d => d.QuestionID)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Questionnaire (Mapping Table)
        modelBuilder.Entity<QuestionnaireEntity>(entity =>
        {
            entity.HasKey(e => e.QuestionnaireID);
            
            entity.HasOne(d => d.QuestionnaireType)
                .WithMany(p => p.Questionnaires)
                .HasForeignKey(d => d.QuestionnaireTypeID);

            entity.HasOne(d => d.Question)
                .WithMany()
                .HasForeignKey(d => d.QuestionID);
        });

        // PredefinedAnswerSubQuestion (Mapping Table)
        modelBuilder.Entity<PredefinedAnswerSubQuestion>(entity =>
        {
            entity.HasKey(e => e.PredefinedAnswerSubQuestionID);

            entity.HasOne(d => d.PredefinedAnswer)
                .WithMany(p => p.SubQuestions)
                .HasForeignKey(d => d.PredefinedAnswerID);

            entity.HasOne(d => d.SubQuestion)
                .WithMany()
                .HasForeignKey(d => d.SubQuestionID)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cycles
        });

        // QuestionComputedConfig
        modelBuilder.Entity<QuestionComputedConfig>(entity =>
        {
            entity.HasKey(e => e.QuestionComputedConfigID);
            entity.Property(e => e.RuleName).HasMaxLength(100);
            entity.Property(e => e.MatrixObjectName).HasMaxLength(100);
            entity.Property(e => e.MatrixOutputColumnName).HasMaxLength(100);

            entity.HasOne(d => d.Question)
                .WithMany()
                .HasForeignKey(d => d.QuestionID)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
