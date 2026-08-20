<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmMainPanal
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.btnFinancialSystem = New System.Windows.Forms.Button()
        Me.btnRegistrationSystem = New System.Windows.Forms.Button()
        Me.SuspendLayout()
        '
        'btnFinancialSystem
        '
        Me.btnFinancialSystem.Location = New System.Drawing.Point(17, 16)
        Me.btnFinancialSystem.Name = "btnFinancialSystem"
        Me.btnFinancialSystem.Size = New System.Drawing.Size(112, 60)
        Me.btnFinancialSystem.TabIndex = 0
        Me.btnFinancialSystem.Text = "النظام المالي" & Global.Microsoft.VisualBasic.ChrW(13) & Global.Microsoft.VisualBasic.ChrW(10) & "Financial System"
        Me.btnFinancialSystem.UseVisualStyleBackColor = True
        '
        'btnRegistrationSystem
        '
        Me.btnRegistrationSystem.Location = New System.Drawing.Point(157, 16)
        Me.btnRegistrationSystem.Name = "btnRegistrationSystem"
        Me.btnRegistrationSystem.Size = New System.Drawing.Size(112, 60)
        Me.btnRegistrationSystem.TabIndex = 1
        Me.btnRegistrationSystem.Text = "نظام التسجيل" & Global.Microsoft.VisualBasic.ChrW(13) & Global.Microsoft.VisualBasic.ChrW(10) & "Registration System"
        Me.btnRegistrationSystem.UseVisualStyleBackColor = True
        '
        'frmMainPanal
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(287, 93)
        Me.Controls.Add(Me.btnRegistrationSystem)
        Me.Controls.Add(Me.btnFinancialSystem)
        Me.Name = "frmMainPanal"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "الكلية التكنلوجية"
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents btnFinancialSystem As System.Windows.Forms.Button
    Friend WithEvents btnRegistrationSystem As System.Windows.Forms.Button
End Class
