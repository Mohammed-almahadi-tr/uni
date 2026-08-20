Imports System.Data.SqlClient
Public Class frmBackUp
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents TextBox1 As System.Windows.Forms.TextBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents FolderBrowserDialog1 As System.Windows.Forms.FolderBrowserDialog
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents OpenFileDialog1 As System.Windows.Forms.OpenFileDialog
    Friend WithEvents PictureBox1 As System.Windows.Forms.PictureBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBackUp))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button2 = New System.Windows.Forms.Button
        Me.Label3 = New System.Windows.Forms.Label
        Me.TextBox1 = New System.Windows.Forms.TextBox
        Me.FolderBrowserDialog1 = New System.Windows.Forms.FolderBrowserDialog
        Me.Button1 = New System.Windows.Forms.Button
        Me.OpenFileDialog1 = New System.Windows.Forms.OpenFileDialog
        Me.PictureBox1 = New System.Windows.Forms.PictureBox
        Me.GroupBox1.SuspendLayout()
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Button2)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.TextBox1)
        Me.GroupBox1.Font = New System.Drawing.Font("Times New Roman", 14.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(178, Byte))
        Me.GroupBox1.Location = New System.Drawing.Point(7, 32)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(472, 80)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "≈‰‘«¡ ‰”Œ… ≈Õ Ì«ÿÌ…"
        '
        'Button2
        '
        Me.Button2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Button2.Location = New System.Drawing.Point(8, 32)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(72, 32)
        Me.Button2.TabIndex = 57
        Me.Button2.Text = "⁄—÷"
        '
        'Label3
        '
        Me.Label3.Font = New System.Drawing.Font("Times New Roman", 9.75!, System.Drawing.FontStyle.Bold)
        Me.Label3.Location = New System.Drawing.Point(408, 40)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(56, 16)
        Me.Label3.TabIndex = 31
        Me.Label3.Text = "«·„Êﬁ⁄ :"
        Me.Label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'TextBox1
        '
        Me.TextBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.TextBox1.Font = New System.Drawing.Font("Times New Roman", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(178, Byte))
        Me.TextBox1.Location = New System.Drawing.Point(88, 36)
        Me.TextBox1.Name = "TextBox1"
        Me.TextBox1.ReadOnly = True
        Me.TextBox1.RightToLeft = System.Windows.Forms.RightToLeft.No
        Me.TextBox1.Size = New System.Drawing.Size(320, 25)
        Me.TextBox1.TabIndex = 0
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(407, 118)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(72, 32)
        Me.Button1.TabIndex = 58
        Me.Button1.Text = "Õ›Ÿ"
        '
        'PictureBox1
        '
        Me.PictureBox1.Image = CType(resources.GetObject("PictureBox1.Image"), System.Drawing.Image)
        Me.PictureBox1.Location = New System.Drawing.Point(7, 0)
        Me.PictureBox1.Name = "PictureBox1"
        Me.PictureBox1.Size = New System.Drawing.Size(88, 48)
        Me.PictureBox1.SizeMode = System.Windows.Forms.PictureBoxSizeMode.StretchImage
        Me.PictureBox1.TabIndex = 62
        Me.PictureBox1.TabStop = False
        '
        'frmBackUp
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(486, 155)
        Me.Controls.Add(Me.PictureBox1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(494, 189)
        Me.MinimumSize = New System.Drawing.Size(494, 189)
        Me.Name = "frmBackUp"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "«·‰”Œ «·≈Õ Ì«ÿÌ"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.PictureBox1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.FolderBrowserDialog1.ShowDialog()
        Me.TextBox1.Text = Me.FolderBrowserDialog1.SelectedPath
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        OpenFileDialog1.Filter = "NFT BackUp (*.nft)|*.nft"
        If OpenFileDialog1.ShowDialog() = DialogResult.OK Then
            Me.TextBox1.Text = Me.OpenFileDialog1.FileName
        Else
            MsgBox("«·„·› €Ì— „ﬁ»Ê·")
            Me.TextBox1.Clear()
            Exit Sub
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Cursor = Cursors.WaitCursor
        If Len(Me.TextBox1.Text) = 0 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·„Êﬁ⁄")
            Me.Cursor = Cursors.Default
            Exit Sub
        End If

        Try
            Dim strDateName As String = Date.Today.ToLongDateString

            If System.IO.File.Exists(Me.TextBox1.Text & "\" & strDateName & ".VE") = True Then
                System.IO.File.Delete(Me.TextBox1.Text & "\" & strDateName & ".VE")
            End If

            Dim cmd As New SqlCommand("sp_dropdevice 'VEBackup'", cnn)
            Dim cmd1 As New SqlCommand("USE VikingEnergy EXEC sp_addumpdevice 'disk', 'VEBackup','" & Me.TextBox1.Text & "\" & strDateName & ".VE' BACKUP DATABASE VikingEnergy TO VEBackup", cnn)

            cnn.Open()
            Try
                cmd.ExecuteNonQuery()
            Catch ex As Exception

            End Try

            Try
                cmd1.ExecuteNonQuery()
            Catch ex As Exception

            End Try
            cnn.Close()
            Me.Cursor = Cursors.Default
            MsgBox("BackUp completed successfully!", MsgBoxStyle.Information)
            Me.TextBox1.Clear()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            Try
                cnn.Close()
            Catch

            End Try
            Me.Cursor = Cursors.Default
        End Try
        Me.Cursor = Cursors.Default
    End Sub
End Class
